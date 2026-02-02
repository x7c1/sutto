import type Gio from 'gi://Gio';

export type LicenseStatus = 'trial' | 'valid' | 'expired' | 'invalid';

export interface LicenseData {
  licenseKey: string;
  activationId: string;
  validUntil: number;
  lastValidated: number;
  trialDaysUsed: number;
  trialLastUsedDate: string;
  status: LicenseStatus;
}

/**
 * Storage layer for license data using GSettings
 */
export class LicenseStorage {
  private settings: Gio.Settings;

  constructor(settings: Gio.Settings) {
    this.settings = settings;
  }

  getLicenseKey(): string {
    return this.settings.get_string('license-key');
  }

  setLicenseKey(key: string): void {
    this.settings.set_string('license-key', key);
  }

  getActivationId(): string {
    return this.settings.get_string('license-activation-id');
  }

  setActivationId(id: string): void {
    this.settings.set_string('license-activation-id', id);
  }

  getValidUntil(): number {
    return this.settings.get_int64('license-valid-until');
  }

  setValidUntil(timestamp: number): void {
    this.settings.set_int64('license-valid-until', timestamp);
  }

  getLastValidated(): number {
    return this.settings.get_int64('license-last-validated');
  }

  setLastValidated(timestamp: number): void {
    this.settings.set_int64('license-last-validated', timestamp);
  }

  getTrialDaysUsed(): number {
    return this.settings.get_int('trial-days-used');
  }

  setTrialDaysUsed(days: number): void {
    this.settings.set_int('trial-days-used', days);
  }

  getTrialLastUsedDate(): string {
    return this.settings.get_string('trial-last-used-date');
  }

  setTrialLastUsedDate(date: string): void {
    this.settings.set_string('trial-last-used-date', date);
  }

  getStatus(): LicenseStatus {
    return this.settings.get_string('license-status') as LicenseStatus;
  }

  setStatus(status: LicenseStatus): void {
    this.settings.set_string('license-status', status);
  }

  getAllData(): LicenseData {
    return {
      licenseKey: this.getLicenseKey(),
      activationId: this.getActivationId(),
      validUntil: this.getValidUntil(),
      lastValidated: this.getLastValidated(),
      trialDaysUsed: this.getTrialDaysUsed(),
      trialLastUsedDate: this.getTrialLastUsedDate(),
      status: this.getStatus(),
    };
  }

  clearLicense(): void {
    this.setLicenseKey('');
    this.setActivationId('');
    this.setValidUntil(0);
    this.setLastValidated(0);
    this.setStatus('trial');
  }
}
