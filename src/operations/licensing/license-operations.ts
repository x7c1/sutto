import type {
  ActivationId,
  DeviceId,
  DisabledReason,
  LicenseKey,
  LicenseRejectionReason,
  LicenseState,
  NetworkState,
} from '../../domain/licensing/index.js';
import {
  createLicenseState,
  daysSinceLastOnline,
  License,
  OFFLINE_GRACE_PERIOD_DAYS,
} from '../../domain/licensing/index.js';
import type { LicenseApiClient } from './license-api-client.js';
import type { LicenseRepository } from './license-repository.js';

declare function log(message: string): void;

/** Message shown when an activation is rejected by the license server. */
const ACTIVATION_REJECTION_MESSAGES: Record<LicenseRejectionReason, string> = {
  INVALID_LICENSE_KEY: 'License key not found',
  INVALID_ACTIVATION: 'Activation is no longer valid',
  LICENSE_EXPIRED: 'Subscription has expired',
  LICENSE_CANCELLED: 'Subscription was cancelled',
  DEVICE_DEACTIVATED: 'This device was deactivated',
};

/** Message shown when the license server did not answer an activation. */
const ACTIVATION_NO_RESPONSE_MESSAGE = "Couldn't reach the license server. Try again later.";

export interface DateProvider {
  now(): Date;
  today(): string;
}

export interface NetworkStateProvider {
  getNetworkState(): NetworkState;

  /**
   * Call `callback` whenever the network state may have changed.
   * @returns A function that stops watching
   */
  watchNetworkState(callback: (state: NetworkState) => void): () => void;
}

export interface DeviceInfoProvider {
  getDeviceId(): DeviceId;
  getDeviceLabel(): string;
}

export interface LicenseOperationsResult {
  success: boolean;
  deactivatedDevice?: string | null;
  error?: string;
  isRetryable?: boolean;
}

/**
 * License management operations.
 * Coordinates validation, activation, and state transitions.
 * Does not contain GLib/timer dependencies - those belong in the controller.
 */
export class LicenseOperations {
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
    log('[LicenseOperations] Initializing...');

    const status = this.repository.getStatus();
    const license = this.repository.loadLicense();
    const online = this.recordOnlineIfConnected();

    // Validating offline cannot succeed; a valid license keeps working on the
    // offline grace period instead.
    if (status === 'valid' && license && online) {
      await this.validateLicense();
    }

    this.notifyStateChange();
  }

  /**
   * Record now as the last time the device was online, if it is online.
   * The offline grace period is counted from this time, whether or not the
   * license server answers. Not a license change: state change callbacks are
   * not notified.
   * @returns true when the device is online
   */
  recordOnlineIfConnected(): boolean {
    if (this.networkStateProvider.getNetworkState() !== 'online') {
      return false;
    }
    this.repository.setLastOnlineAt(this.dateProvider.now());
    return true;
  }

  /**
   * Record the last time the device was online whenever the network state
   * changes while or after being online: when the network comes back, and when
   * it goes away (the device was online until then). Like
   * recordOnlineIfConnected(), this does not notify state change callbacks.
   * @param onOnline Called after recording, whenever the network is online.
   *   Reconnecting can end an exceeded offline grace period, so a caller that
   *   caches the disabled reason uses it to recompute that reason.
   * @returns A function that stops watching
   */
  watchNetworkState(onOnline?: () => void): () => void {
    let wasOnline = this.networkStateProvider.getNetworkState() === 'online';
    return this.networkStateProvider.watchNetworkState((state) => {
      const online = state === 'online';
      if (online || wasOnline) {
        this.repository.setLastOnlineAt(this.dateProvider.now());
      }
      wasOnline = online;
      if (online) {
        onOnline?.();
      }
    });
  }

  /**
   * Register a callback to be notified of state changes
   */
  onStateChange(callback: (state: LicenseState) => void): void {
    this.stateChangeCallbacks.push(callback);
  }

  /**
   * Follow license changes stored by another process (e.g. a license activated
   * in the preferences window) by notifying state change callbacks whenever
   * the stored license or trial data changes.
   *
   * Handling a change never writes license or trial data (at most it fills in
   * a missing last-online time, which is not watched), so this process's own
   * writes cannot start a notification loop.
   * @returns A function that stops watching
   */
  watchStoredChanges(): () => void {
    return this.repository.watchChanges(() => {
      log('[LicenseOperations] Stored license data changed');
      this.notifyStateChange();
    });
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

    return createLicenseState({
      status,
      networkState,
      trialDaysRemaining: trial.getRemainingDays(),
      validUntil: license?.validUntil ?? null,
      daysSinceLastOnline: this.getDaysSinceLastOnline(),
    });
  }

  /**
   * Resolve why the extension is currently disabled.
   * Returns null when the extension should be enabled.
   *
   * This is the single source of truth for license gating: it drives both
   * `shouldExtensionBeEnabled()` and the message shown in the locked panel.
   */
  getDisabledReason(): DisabledReason | null {
    const state = this.getState();

    switch (state.status) {
      case 'trial': {
        const trial = this.repository.loadTrialPeriod();
        return trial.isExpired() ? 'trial-expired' : null;
      }
      case 'valid': {
        const graceExceeded =
          state.networkState === 'offline' &&
          state.daysSinceLastOnline >= OFFLINE_GRACE_PERIOD_DAYS;
        return graceExceeded ? 'offline-grace-exceeded' : null;
      }
      case 'expired':
        return 'license-expired';
      case 'invalid':
        return 'license-invalid';
    }
  }

  /**
   * Check if the extension should be enabled based on license status
   */
  shouldExtensionBeEnabled(): boolean {
    return this.getDisabledReason() === null;
  }

  /**
   * Activate a license key for this device
   */
  async activate(licenseKey: LicenseKey): Promise<LicenseOperationsResult> {
    log('[LicenseOperations] Activating license...');

    const deviceId = this.deviceInfoProvider.getDeviceId();
    const deviceLabel = this.deviceInfoProvider.getDeviceLabel();

    const result = await this.apiClient.activate(licenseKey, deviceId, deviceLabel);

    if (result.kind === 'success') {
      this.repository.saveLicense(
        this.createLicenseFromActivation(
          licenseKey,
          result.data.activationId,
          result.data.validUntil
        )
      );
      this.repository.setStatus('valid');

      log('[LicenseOperations] License activated successfully');
      this.notifyStateChange();

      return {
        success: true,
        deactivatedDevice: result.data.deactivatedDevice,
      };
    }

    if (result.kind === 'rejected') {
      // A rejected activation changes nothing: whatever was stored (e.g. a
      // trial) stays as it was.
      log(`[LicenseOperations] Activation rejected: ${result.reason}`);
      return { success: false, error: ACTIVATION_REJECTION_MESSAGES[result.reason] };
    }

    log('[LicenseOperations] No response from the license server during activation');
    return { success: false, error: ACTIVATION_NO_RESPONSE_MESSAGE, isRetryable: true };
  }

  /**
   * Validate the current license with the backend
   */
  async validateLicense(): Promise<boolean> {
    const license = this.repository.loadLicense();

    if (!license) {
      log('[LicenseOperations] No license to validate');
      return false;
    }

    log('[LicenseOperations] Validating license...');

    const result = await this.apiClient.validate(license.licenseKey, license.activationId);

    if (result.kind === 'success') {
      const updatedLicense = license.withValidation(
        result.data.validUntil,
        this.dateProvider.now()
      );
      this.repository.saveLicense(updatedLicense);
      this.repository.setStatus('valid');

      log('[LicenseOperations] License validation successful');
      this.notifyStateChange();
      return true;
    }

    if (result.kind === 'rejected') {
      this.handleValidationRejection(result.reason);
      return false;
    }

    log('[LicenseOperations] No response from the license server, keeping stored status');
    return this.repository.getStatus() === 'valid';
  }

  /**
   * Clear the current license and return to trial mode
   */
  clearLicense(): void {
    this.repository.clearLicense();
    this.notifyStateChange();
    log('[LicenseOperations] License cleared, returning to trial mode');
  }

  /**
   * Record today as a trial usage day, at most once per calendar day.
   * Does nothing unless the stored status is trial, so a licensed user never
   * gets trial days written.
   * @returns true when a new day was recorded
   */
  recordTrialUsage(): boolean {
    if (this.repository.getStatus() !== 'trial') {
      return false;
    }

    const trial = this.repository.loadTrialPeriod();
    const today = this.dateProvider.today();

    if (!trial.canRecordUsage(today)) {
      return false;
    }

    const updatedTrial = trial.recordUsage(today);
    this.repository.saveTrialPeriod(updatedTrial);

    log(
      `[LicenseOperations] Recorded trial day ${updatedTrial.daysUsed.toNumber()}/${30} (${today})`
    );

    if (updatedTrial.isExpired()) {
      log('[LicenseOperations] Trial period has ended');
      this.repository.setStatus('expired');
    }

    this.notifyStateChange();
    return true;
  }

  /**
   * Days since the device was last online. A missing last-online time (e.g. an
   * installation from before it was recorded) counts as now and is stored, so
   * it never locks the extension.
   */
  private getDaysSinceLastOnline(): number {
    const now = this.dateProvider.now();
    const lastOnlineAt = this.repository.getLastOnlineAt();
    if (!lastOnlineAt) {
      this.repository.setLastOnlineAt(now);
      return 0;
    }
    return daysSinceLastOnline(lastOnlineAt, now);
  }

  private handleValidationRejection(reason: LicenseRejectionReason): void {
    log(`[LicenseOperations] Validation rejected: ${reason}`);

    switch (reason) {
      case 'LICENSE_EXPIRED':
      case 'LICENSE_CANCELLED':
      case 'DEVICE_DEACTIVATED':
        this.repository.setStatus('expired');
        break;
      case 'INVALID_LICENSE_KEY':
      case 'INVALID_ACTIVATION':
        this.repository.setStatus('invalid');
        break;
    }

    this.notifyStateChange();
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
        log(`[LicenseOperations] State change callback error: ${e}`);
      }
    }
  }
}
