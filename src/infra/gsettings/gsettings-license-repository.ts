import type Gio from 'gi://Gio';

import {
  ActivationId,
  License,
  LicenseKey,
  type LicenseStatus,
  parseLicenseStatus,
  Trial,
  TrialDays,
} from '../../domain/licensing/index.js';
import type { LicenseRepository } from '../../usecase/licensing/index.js';

const log = (message: string): void => console.log(message);

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

    const licenseKey = LicenseKey.tryCreate(licenseKeyStr);
    const activationId = ActivationId.tryCreate(activationIdStr);

    if (!licenseKey || !activationId) {
      log('[GSettingsLicenseRepository] Invalid license data in storage');
      return null;
    }

    let status: LicenseStatus;
    try {
      status = parseLicenseStatus(statusStr);
    } catch {
      log(`[GSettingsLicenseRepository] Invalid status in storage: ${statusStr}`);
      status = 'invalid';
    }

    try {
      return License.create({
        licenseKey,
        activationId,
        validUntil: new Date(validUntil * 1000),
        lastValidated: new Date(lastValidated * 1000),
        status,
      });
    } catch (e) {
      log(`[GSettingsLicenseRepository] Failed to create License: ${e}`);
      return null;
    }
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

  loadTrial(): Trial {
    const daysUsed = this.settings.get_int('trial-days-used');
    const lastUsedDate = this.settings.get_string('trial-last-used-date');

    const trialDays = TrialDays.tryCreate(daysUsed);
    if (!trialDays) {
      log(`[GSettingsLicenseRepository] Invalid trial days in storage: ${daysUsed}`);
      return Trial.initial();
    }

    return Trial.create({
      daysUsed: trialDays,
      lastUsedDate: lastUsedDate ?? '',
    });
  }

  saveTrial(trial: Trial): void {
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
