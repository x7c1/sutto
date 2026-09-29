import type Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {
  ActivationId,
  License,
  LicenseKey,
  type LicenseStatus,
  parseLicenseStatus,
  TrialDays,
  TrialPeriod,
} from '../../domain/licensing/index.js';
import type { LicenseRepository } from '../../operations/licensing/index.js';

declare function log(message: string): void;

/**
 * GSettings keys that feed the license state.
 * The trial warning threshold is deliberately excluded: it does not affect
 * whether the extension is enabled.
 */
const LICENSE_STATE_KEYS = [
  'license-status',
  'license-key',
  'license-activation-id',
  'license-valid-until',
  'license-last-validated',
  'trial-days-used',
  'trial-last-used-date',
] as const;

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

  getTrialWarningThreshold(): number {
    return this.settings.get_int('trial-warning-last-threshold');
  }

  setTrialWarningThreshold(threshold: number): void {
    this.settings.set_int('trial-warning-last-threshold', threshold);
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

  /**
   * Watch the license state keys for changes.
   *
   * Saving a license writes several keys one by one, so the callback is
   * deferred to an idle callback: a burst of writes is reported once, after
   * all of them have landed, instead of once per key with partial state.
   */
  watchChanges(callback: () => void): () => void {
    let pendingId: number | null = null;

    const signalIds = LICENSE_STATE_KEYS.map((key) => {
      const signalId = this.settings.connect(`changed::${key}`, () => {
        if (pendingId !== null) {
          return;
        }
        pendingId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
          pendingId = null;
          try {
            callback();
          } catch (e) {
            log(`[GSettingsLicenseRepository] Change callback error: ${e}`);
          }
          return GLib.SOURCE_REMOVE;
        });
      });
      // GSettings only emits `changed` for a key that has been read while a
      // handler is connected, so read it once here rather than relying on
      // the caller to read every key after watching.
      this.settings.get_value(key);
      return signalId;
    });

    return () => {
      for (const signalId of signalIds) {
        this.settings.disconnect(signalId);
      }
      if (pendingId !== null) {
        GLib.source_remove(pendingId);
        pendingId = null;
      }
    };
  }
}
