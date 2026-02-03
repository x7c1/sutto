import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
  BackendUnreachableError,
  LicenseApiError,
  LicenseClient,
  NetworkError,
} from './license-client.js';
import type { LicenseStatus, LicenseStorage } from './license-storage.js';
import type { TrialManager } from './trial-manager.js';

const log = (message: string): void => console.log(message);

const SECONDS_PER_DAY = 24 * 60 * 60;
const OFFLINE_GRACE_PERIOD_DAYS = 7;
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type NetworkState = 'online' | 'offline' | 'backend_unreachable';

export interface LicenseState {
  status: LicenseStatus;
  networkState: NetworkState;
  trialDaysRemaining: number;
  validUntil: Date | null;
  daysSinceLastValidation: number;
  errorMessage?: string;
}

export interface ActivationResult {
  success: boolean;
  deactivatedDevice?: string | null;
  error?: string;
}

/**
 * Core license management service
 * Coordinates validation, activation, caching, and state transitions
 */
export class LicenseManager {
  private storage: LicenseStorage;
  private client: LicenseClient;
  private trialManager: TrialManager;
  private validationTimerId: number | null = null;
  private stateChangeCallbacks: ((state: LicenseState) => void)[] = [];

  constructor(storage: LicenseStorage, client: LicenseClient, trialManager: TrialManager) {
    this.storage = storage;
    this.client = client;
    this.trialManager = trialManager;
  }

  /**
   * Initialize license checking on startup
   * Should be called when extension is enabled
   */
  async initialize(): Promise<void> {
    log('[LicenseManager] Initializing...');

    const status = this.storage.getStatus();
    const licenseKey = this.storage.getLicenseKey();

    if (status === 'valid' && licenseKey) {
      await this.validateLicense();
    } else if (status === 'trial') {
      await this.handleTrialStartup();
    }

    this.schedulePeriodicValidation();
    this.notifyStateChange();
  }

  /**
   * Clean up resources when extension is disabled
   */
  destroy(): void {
    if (this.validationTimerId !== null) {
      GLib.source_remove(this.validationTimerId);
      this.validationTimerId = null;
    }
    this.stateChangeCallbacks = [];
  }

  /**
   * Register a callback to be notified of state changes
   */
  onStateChange(callback: (state: LicenseState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Get the current license state
   */
  getState(): LicenseState {
    const status = this.storage.getStatus();
    const lastValidated = this.storage.getLastValidated();
    const validUntil = this.storage.getValidUntil();
    const now = Math.floor(Date.now() / 1000);

    const daysSinceLastValidation = lastValidated > 0 ? (now - lastValidated) / SECONDS_PER_DAY : 0;

    return {
      status,
      networkState: this.getNetworkState(),
      trialDaysRemaining: this.trialManager.getRemainingDays(),
      validUntil: validUntil > 0 ? new Date(validUntil * 1000) : null,
      daysSinceLastValidation,
    };
  }

  /**
   * Check if the extension should be enabled based on license status
   */
  shouldExtensionBeEnabled(): boolean {
    const state = this.getState();

    if (state.status === 'trial') {
      return !this.trialManager.isExpired();
    }

    if (state.status === 'valid') {
      if (state.networkState === 'offline') {
        return state.daysSinceLastValidation < OFFLINE_GRACE_PERIOD_DAYS;
      }
      return true;
    }

    return false;
  }

  /**
   * Activate a license key for this device
   */
  async activate(licenseKey: string): Promise<ActivationResult> {
    log('[LicenseManager] Activating license...');

    const deviceId = this.getDeviceId();
    const deviceLabel = this.getDeviceLabel();

    try {
      const response = await this.client.activate(licenseKey, deviceId, deviceLabel);

      this.storage.setLicenseKey(licenseKey);
      this.storage.setActivationId(response.activation_id);
      this.storage.setValidUntil(this.parseTimestamp(response.valid_until));
      this.storage.setLastValidated(Math.floor(Date.now() / 1000));
      this.storage.setStatus('valid');

      log(`[LicenseManager] License activated successfully`);
      this.notifyStateChange();

      return {
        success: true,
        deactivatedDevice: response.deactivated_device,
      };
    } catch (e) {
      return this.handleActivationError(e);
    }
  }

  /**
   * Validate the current license with the backend
   */
  async validateLicense(): Promise<boolean> {
    const licenseKey = this.storage.getLicenseKey();
    const activationId = this.storage.getActivationId();

    if (!licenseKey || !activationId) {
      log('[LicenseManager] No license to validate');
      return false;
    }

    log('[LicenseManager] Validating license...');

    try {
      const response = await this.client.validate(licenseKey, activationId);

      this.storage.setValidUntil(this.parseTimestamp(response.valid_until));
      this.storage.setLastValidated(Math.floor(Date.now() / 1000));
      this.storage.setStatus('valid');

      log('[LicenseManager] License validation successful');
      this.notifyStateChange();
      return true;
    } catch (e) {
      return this.handleValidationError(e);
    }
  }

  /**
   * Clear the current license and return to trial mode
   */
  clearLicense(): void {
    this.storage.clearLicense();
    this.notifyStateChange();
    log('[LicenseManager] License cleared, returning to trial mode');
  }

  private async handleTrialStartup(): Promise<void> {
    const networkState = this.getNetworkState();

    if (networkState === 'backend_unreachable') {
      log('[LicenseManager] Backend unreachable during trial, not counting usage day');
      return;
    }

    this.trialManager.recordUsageDay();
    this.notifyStateChange();
  }

  private handleActivationError(e: unknown): ActivationResult {
    if (e instanceof LicenseApiError) {
      const errorMessages: Record<string, string> = {
        INVALID_LICENSE_KEY: 'License key not found',
        LICENSE_EXPIRED: 'Subscription has expired',
        LICENSE_CANCELLED: 'Subscription was cancelled',
      };

      this.storage.setStatus('invalid');
      this.notifyStateChange();

      return {
        success: false,
        error: errorMessages[e.errorType] ?? e.errorType,
      };
    }

    if (e instanceof NetworkError || e instanceof BackendUnreachableError) {
      return {
        success: false,
        error: 'Cannot connect to server. Please check your internet connection.',
      };
    }

    log(`[LicenseManager] Unknown activation error: ${e}`);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }

  private handleValidationError(e: unknown): boolean {
    if (e instanceof LicenseApiError) {
      log(`[LicenseManager] Validation failed: ${e.errorType}`);

      if (
        e.errorType === 'LICENSE_EXPIRED' ||
        e.errorType === 'LICENSE_CANCELLED' ||
        e.errorType === 'DEVICE_DEACTIVATED'
      ) {
        this.storage.setStatus('expired');
      } else {
        this.storage.setStatus('invalid');
      }

      this.notifyStateChange();
      return false;
    }

    if (e instanceof NetworkError || e instanceof BackendUnreachableError) {
      log('[LicenseManager] Backend unreachable during validation, using cached status');
      return this.storage.getStatus() === 'valid';
    }

    log(`[LicenseManager] Unknown validation error: ${e}`);
    return false;
  }

  private schedulePeriodicValidation(): void {
    this.validationTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, VALIDATION_INTERVAL_MS, () => {
      const status = this.storage.getStatus();
      if (status === 'valid') {
        this.validateLicense().catch((e) => {
          log(`[LicenseManager] Periodic validation failed: ${e}`);
        });
      }
      return GLib.SOURCE_CONTINUE;
    });
  }

  private getNetworkState(): NetworkState {
    if (!LicenseClient.isNetworkAvailable()) {
      return 'offline';
    }
    return 'online';
  }

  private getDeviceId(): string {
    try {
      const file = Gio.File.new_for_path('/etc/machine-id');
      const [success, contents] = file.load_contents(null);
      if (success && contents) {
        return new TextDecoder().decode(contents).trim();
      }
    } catch (e) {
      log(`[LicenseManager] Failed to read machine-id: ${e}`);
    }
    return 'unknown-device';
  }

  private getDeviceLabel(): string {
    let label = this.getPrettyHostname();

    if (!label) {
      label = GLib.get_host_name() ?? 'Unknown Device';
    }

    return label.substring(0, 64);
  }

  private getPrettyHostname(): string | null {
    try {
      const file = Gio.File.new_for_path('/etc/machine-info');
      const [success, contents] = file.load_contents(null);
      if (success && contents) {
        const text = new TextDecoder().decode(contents);
        const match = text.match(/PRETTY_HOSTNAME=["']?([^"'\n]+)/);
        if (match) {
          return match[1];
        }
      }
    } catch {
      // machine-info may not exist, fall through to hostname
    }
    return null;
  }

  private parseTimestamp(isoString: string): number {
    const date = new Date(isoString);
    return Math.floor(date.getTime() / 1000);
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(state);
      } catch (e) {
        log(`[LicenseManager] State change callback error: ${e}`);
      }
    }
  }
}
