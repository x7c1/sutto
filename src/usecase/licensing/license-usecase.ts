import type {
  ActivationId,
  DeviceId,
  LicenseKey,
  LicenseState,
  NetworkState,
} from '../../domain/licensing/index.js';
import {
  type ActivationResult,
  createLicenseState,
  License,
} from '../../domain/licensing/index.js';
import type { LicenseApiClient, ValidationError } from './license-api-client.js';
import type { LicenseRepository } from './license-repository.js';

declare function log(message: string): void;

const OFFLINE_GRACE_PERIOD_DAYS = 7;

export interface DateProvider {
  now(): Date;
  today(): string;
}

export interface NetworkStateProvider {
  getNetworkState(): NetworkState;
}

export interface DeviceInfoProvider {
  getDeviceId(): DeviceId;
  getDeviceLabel(): string;
}

export interface LicenseUsecaseResult {
  success: boolean;
  deactivatedDevice?: string | null;
  error?: string;
  isRetryable?: boolean;
}

/**
 * License management use case
 * Coordinates validation, activation, and state transitions
 * Does not contain GLib/timer dependencies - those belong in the controller
 */
export class LicenseUsecase {
  private readonly repository: LicenseRepository;
  private readonly apiClient: LicenseApiClient;
  private readonly dateProvider: DateProvider;
  private readonly networkStateProvider: NetworkStateProvider;
  private readonly deviceInfoProvider: DeviceInfoProvider;
  private stateChangeCallbacks: ((state: LicenseState) => void)[] = [];

  constructor(
    repository: LicenseRepository,
    apiClient: LicenseApiClient,
    dateProvider: DateProvider,
    networkStateProvider: NetworkStateProvider,
    deviceInfoProvider: DeviceInfoProvider
  ) {
    this.repository = repository;
    this.apiClient = apiClient;
    this.dateProvider = dateProvider;
    this.networkStateProvider = networkStateProvider;
    this.deviceInfoProvider = deviceInfoProvider;
  }

  /**
   * Initialize license state on startup
   * Should be called when extension is enabled
   */
  async initialize(): Promise<void> {
    log('[LicenseUsecase] Initializing...');

    const status = this.repository.getStatus();
    const license = this.repository.loadLicense();

    if (status === 'valid' && license) {
      await this.validateLicense();
    } else if (status === 'trial') {
      await this.handleTrialStartup();
    }

    this.notifyStateChange();
  }

  /**
   * Register a callback to be notified of state changes
   */
  onStateChange(callback: (state: LicenseState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Clear all state change callbacks
   */
  clearCallbacks(): void {
    this.stateChangeCallbacks = [];
  }

  /**
   * Get the current license state
   */
  getState(): LicenseState {
    const status = this.repository.getStatus();
    const license = this.repository.loadLicense();
    const trial = this.repository.loadTrialPeriod();
    const networkState = this.networkStateProvider.getNetworkState();

    const daysSinceLastValidation = license ? license.daysSinceLastValidation() : 0;

    return createLicenseState({
      status,
      networkState,
      trialDaysRemaining: trial.getRemainingDays(),
      validUntil: license?.validUntil ?? null,
      daysSinceLastValidation,
    });
  }

  /**
   * Check if the extension should be enabled based on license status
   */
  shouldExtensionBeEnabled(): boolean {
    const state = this.getState();

    if (state.status === 'trial') {
      const trial = this.repository.loadTrialPeriod();
      return !trial.isExpired();
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
  async activate(licenseKey: LicenseKey): Promise<LicenseUsecaseResult> {
    log('[LicenseUsecase] Activating license...');

    const deviceId = this.deviceInfoProvider.getDeviceId();
    const deviceLabel = this.deviceInfoProvider.getDeviceLabel();

    const result = await this.apiClient.activate(licenseKey, deviceId, deviceLabel);

    if (result.isSuccess()) {
      const data = result.getData()!;
      this.repository.saveLicense(
        this.createLicenseFromActivation(licenseKey, data.activationId, data.validUntil)
      );
      this.repository.setStatus('valid');

      log('[LicenseUsecase] License activated successfully');
      this.notifyStateChange();

      return {
        success: true,
        deactivatedDevice: data.deactivatedDevice,
      };
    }

    return this.handleActivationError(result);
  }

  /**
   * Validate the current license with the backend
   */
  async validateLicense(): Promise<boolean> {
    const license = this.repository.loadLicense();

    if (!license) {
      log('[LicenseUsecase] No license to validate');
      return false;
    }

    log('[LicenseUsecase] Validating license...');

    const result = await this.apiClient.validate(license.licenseKey, license.activationId);

    if (result.isSuccess()) {
      const data = result.getData()!;
      const updatedLicense = license.withValidation(data.validUntil, this.dateProvider.now());
      this.repository.saveLicense(updatedLicense);
      this.repository.setStatus('valid');

      log('[LicenseUsecase] License validation successful');
      this.notifyStateChange();
      return true;
    }

    return this.handleValidationError(result.getError()!);
  }

  /**
   * Clear the current license and return to trial mode
   */
  clearLicense(): void {
    this.repository.clearLicense();
    this.notifyStateChange();
    log('[LicenseUsecase] License cleared, returning to trial mode');
  }

  /**
   * Record a trial usage day (called at startup when in trial mode)
   */
  recordTrialUsage(): boolean {
    const trial = this.repository.loadTrialPeriod();
    const today = this.dateProvider.today();

    if (!trial.canRecordUsage(today)) {
      log(`[LicenseUsecase] Trial usage already recorded for today`);
      return false;
    }

    const updatedTrial = trial.recordUsage(today);
    this.repository.saveTrialPeriod(updatedTrial);

    log(`[LicenseUsecase] Recorded trial day ${updatedTrial.daysUsed.toNumber()}/${30} (${today})`);

    if (updatedTrial.isExpired()) {
      log('[LicenseUsecase] Trial period has ended');
      this.repository.setStatus('expired');
    }

    this.notifyStateChange();
    return true;
  }

  private async handleTrialStartup(): Promise<void> {
    const networkState = this.networkStateProvider.getNetworkState();

    if (networkState === 'backend_unreachable') {
      log('[LicenseUsecase] Backend unreachable during trial, not counting usage day');
      return;
    }

    this.recordTrialUsage();
  }

  private handleActivationError(result: ActivationResult): LicenseUsecaseResult {
    const error = result.getError();

    const errorMessages: Record<string, string> = {
      INVALID_LICENSE_KEY: 'License key not found',
      LICENSE_EXPIRED: 'Subscription has expired',
      LICENSE_CANCELLED: 'Subscription was cancelled',
      NETWORK_ERROR: 'No internet connection',
      BACKEND_UNREACHABLE: 'License server unavailable',
    };

    if (error === 'NETWORK_ERROR' || error === 'BACKEND_UNREACHABLE') {
      return {
        success: false,
        error: errorMessages[error],
        isRetryable: true,
      };
    }

    this.repository.setStatus('invalid');
    this.notifyStateChange();

    return {
      success: false,
      error: error ? (errorMessages[error] ?? error) : 'An unexpected error occurred',
    };
  }

  private handleValidationError(error: ValidationError): boolean {
    log(`[LicenseUsecase] Validation failed: ${error}`);

    if (
      error === 'LICENSE_EXPIRED' ||
      error === 'LICENSE_CANCELLED' ||
      error === 'DEVICE_DEACTIVATED'
    ) {
      this.repository.setStatus('expired');
    } else if (error === 'NETWORK_ERROR' || error === 'BACKEND_UNREACHABLE') {
      log('[LicenseUsecase] Backend unreachable during validation, using cached status');
      return this.repository.getStatus() === 'valid';
    } else {
      this.repository.setStatus('invalid');
    }

    this.notifyStateChange();
    return false;
  }

  private createLicenseFromActivation(
    licenseKey: LicenseKey,
    activationId: ActivationId,
    validUntil: Date
  ): License {
    return new License({
      licenseKey,
      activationId,
      validUntil,
      lastValidated: this.dateProvider.now(),
      status: 'valid',
    });
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(state);
      } catch (e) {
        log(`[LicenseUsecase] State change callback error: ${e}`);
      }
    }
  }
}
