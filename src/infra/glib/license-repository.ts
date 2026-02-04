import type Gio from 'gi://Gio';

import {
  ActivationId,
  License,
  LicenseKey,
  type LicenseStatus,
  parseLicenseStatus,
  TrialDays,
  TrialPeriod,
} from '../../domain/licensing/index.js';
import type { LicenseRepository } from '../../usecase/licensing/index.js';

/**
 * GSettings implementation of LicenseRepository
 * Converts GSettings values to domain objects
 */
export class GSettingsLicenseRepository implements LicenseRepository {
  constructor(private readonly settings: Gio.Settings) {}

  loadLicense(): License | null {
    const licenseKeyStr = this.settings.get_string('license-key');
    const activationIdStr = this.settings.get_string('license-activation-id');
    const validUntil = this.settings.get_int64('license-valid-until');
    const lastValidated = this.settings.get_int64('license-last-validated');
    const statusStr = this.settings.get_string('license-status');

    if (!licenseKeyStr || !activationIdStr) {
      return null;
    }

    const licenseKey = new LicenseKey(licenseKeyStr);
    const activationId = new ActivationId(activationIdStr);
    const status = parseLicenseStatus(statusStr);

    return new License({
      licenseKey,
      activationId,
      validUntil: new Date(validUntil * 1000),
      lastValidated: new Date(lastValidated * 1000),
      status,
    });
  }

  saveLicense(license: License): void {
    this.settings.set_string('license-key', license.licenseKey.toString());
    this.settings.set_string('license-activation-id', license.activationId.toString());
    this.settings.set_int64('license-valid-until', Math.floor(license.validUntil.getTime() / 1000));
    this.settings.set_int64(
      'license-last-validated',
      Math.floor(license.lastValidated.getTime() / 1000)
    );
    this.settings.set_string('license-status', license.status);
  }

  loadTrialPeriod(): TrialPeriod {
    const daysUsed = this.settings.get_int('trial-days-used');
    const lastUsedDate = this.settings.get_string('trial-last-used-date');

    return new TrialPeriod({
      daysUsed: new TrialDays(daysUsed),
      lastUsedDate: lastUsedDate ?? '',
    });
  }

  saveTrialPeriod(trial: TrialPeriod): void {
    this.settings.set_int('trial-days-used', trial.daysUsed.toNumber());
    this.settings.set_string('trial-last-used-date', trial.lastUsedDate);
  }

  getStatus(): LicenseStatus {
    const statusStr = this.settings.get_string('license-status');
    try {
      return parseLicenseStatus(statusStr);
    } catch {
      return 'trial';
    }
  }

  setStatus(status: LicenseStatus): void {
    this.settings.set_string('license-status', status);
  }

  clearLicense(): void {
    this.settings.set_string('license-key', '');
    this.settings.set_string('license-activation-id', '');
    this.settings.set_int64('license-valid-until', 0);
    this.settings.set_int64('license-last-validated', 0);
    this.settings.set_string('license-status', 'trial');
  }
}
