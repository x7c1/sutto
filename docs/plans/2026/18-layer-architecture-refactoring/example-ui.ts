// ===== Example: UI Layer =====
// This file demonstrates how UI interacts with UseCase layer
// Error handling uses try-catch (not Result types)

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

// --- Types from other layers (imported) ---

// Domain types
class LicenseKey {
  #brand: void;
  constructor(readonly value: string) {
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)) {
      throw new ValidationError('Invalid license key format');
    }
  }
}

class DeviceId {
  #brand: void;
  constructor(readonly value: string) {
    if (!value) {
      throw new ValidationError('Device ID is required');
    }
  }
}

interface License {
  key: LicenseKey;
  status: string;
  validUntil: Date;
}

// Error types
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// UseCase interface
interface ActivateLicense {
  execute(key: LicenseKey, deviceId: DeviceId): Promise<License>;
}

// --- UI Implementation ---

export class LicenseSettingsPage {
  #activateLicense: ActivateLicense;
  #entryRow: Adw.EntryRow;
  #statusLabel: Gtk.Label;
  #activateButton: Gtk.Button;

  constructor(activateLicense: ActivateLicense) {
    // UseCase is injected (no direct infra dependency)
    this.#activateLicense = activateLicense;

    this.#entryRow = new Adw.EntryRow({ title: 'License Key' });
    this.#statusLabel = new Gtk.Label({ label: '' });
    this.#activateButton = new Gtk.Button({ label: 'Activate' });

    this.#activateButton.connect('clicked', () => {
      // Signal handler is thin - delegates immediately
      this.#onActivateClicked();
    });
  }

  async #onActivateClicked(): Promise<void> {
    const rawKey = this.#entryRow.get_text();
    const rawDeviceId = 'device-123'; // Would come from system

    this.#setLoading(true);

    try {
      // Create domain objects (may throw ValidationError)
      const key = new LicenseKey(rawKey);
      const deviceId = new DeviceId(rawDeviceId);

      // Execute use case (may throw NetworkError, etc.)
      const license = await this.#activateLicense.execute(key, deviceId);

      this.#showSuccess(license);
    } catch (e) {
      this.#showError(e);
    } finally {
      this.#setLoading(false);
    }
  }

  #showError(error: unknown): void {
    if (error instanceof ValidationError) {
      this.#statusLabel.set_label('Invalid license key format');
    } else if (error instanceof NetworkError) {
      this.#statusLabel.set_label('Network error. Please try again.');
    } else {
      this.#statusLabel.set_label('An unexpected error occurred');
    }
  }

  #showSuccess(license: License): void {
    const until = license.validUntil.toLocaleDateString();
    this.#statusLabel.set_label(`Activated! Valid until ${until}`);
  }

  #setLoading(loading: boolean): void {
    this.#activateButton.set_sensitive(!loading);
    this.#entryRow.set_sensitive(!loading);
  }
}

// --- Wiring (in extension entry point or prefs.ts) ---

// import { ActivateLicense } from '../usecase/licensing/activate-license';
// import { HttpLicenseApiClient } from '../infra/api/http-license-api-client';
// import { GSettingsLicenseRepository } from '../infra/gsettings/gsettings-license-repository';
//
// const activateLicense = new ActivateLicense(
//   new GSettingsLicenseRepository(settings),
//   new HttpLicenseApiClient(),
// );
//
// const page = new LicenseSettingsPage(activateLicense);
