// ===== Example: Composition Root =====
// This file demonstrates how to wire all layers together
// Location: extension.ts or prefs.ts (entry points)

import Gio from 'gi://Gio';

// --- Domain Layer (no instantiation needed, just types) ---
// import { License, LicenseKey, DeviceId } from './domain/licensing/...';

// --- UseCase Layer ---
// import { ActivateLicense } from './usecase/licensing/activate-license';
// import { ValidateLicense } from './usecase/licensing/validate-license';
// import { LoadSpaceCollection } from './usecase/layout/load-space-collection';

// --- Infrastructure Layer ---
// import { HttpLicenseApiClient } from './infra/api/http-license-api-client';
// import { GSettingsLicenseRepository } from './infra/gsettings/gsettings-license-repository';
// import { FileSpaceCollectionRepository } from './infra/file/file-space-collection-repository';
// import { GnomeMonitorDetector } from './infra/monitor/gnome-monitor-detector';

// --- UI Layer ---
// import { LicenseSettingsPage } from './ui/settings/license-settings-page';
// import { Controller } from './ui/controller';
// import { MainPanel } from './ui/main-panel';

// ===========================================
// Placeholder types for demonstration
// ===========================================

interface LicenseRepository {
  save(license: unknown): Promise<void>;
  load(): Promise<unknown>;
}

interface LicenseApiClient {
  activate(key: unknown, deviceId: unknown): Promise<unknown>;
}

class HttpLicenseApiClient implements LicenseApiClient {
  constructor(private baseUrl: string) {}
  async activate(key: unknown, deviceId: unknown) {
    return {};
  }
}

class GSettingsLicenseRepository implements LicenseRepository {
  constructor(private settings: Gio.Settings) {}
  async save(license: unknown) {}
  async load() {
    return null;
  }
}

class ActivateLicense {
  constructor(
    private repository: LicenseRepository,
    private apiClient: LicenseApiClient,
  ) {}
  // Receives domain types, throws exceptions
  // Note: apiClient.activate() returns domain objects (conversion happens in Infrastructure)
  async execute(key: unknown, deviceId: unknown): Promise<unknown> {
    const license = await this.apiClient.activate(key, deviceId);
    await this.repository.save(license);
    return license;
  }
}

class ValidateLicense {
  constructor(
    private repository: LicenseRepository,
    private apiClient: LicenseApiClient,
  ) {}
  async execute(): Promise<unknown> {
    return {};
  }
}

class LicenseSettingsPage {
  constructor(private activateLicense: ActivateLicense) {}
}

class Controller {
  constructor(private validateLicense: ValidateLicense) {}
}

// ===========================================
// Composition Root
// ===========================================

export function createExtension(settings: Gio.Settings) {
  // 1. Infrastructure Layer - instantiate concrete implementations
  const licenseApiClient = new HttpLicenseApiClient(
    'https://api.example.com',
  );
  const licenseRepository = new GSettingsLicenseRepository(settings);

  // 2. UseCase Layer - inject infrastructure via interfaces
  const activateLicense = new ActivateLicense(
    licenseRepository,
    licenseApiClient,
  );
  const validateLicense = new ValidateLicense(
    licenseRepository,
    licenseApiClient,
  );

  // 3. UI Layer - inject use cases
  const controller = new Controller(validateLicense);

  return { controller };
}

export function createPrefsPage(settings: Gio.Settings) {
  // Same infrastructure
  const licenseApiClient = new HttpLicenseApiClient(
    'https://api.example.com',
  );
  const licenseRepository = new GSettingsLicenseRepository(settings);

  // UseCase
  const activateLicense = new ActivateLicense(
    licenseRepository,
    licenseApiClient,
  );

  // UI
  const licenseSettingsPage = new LicenseSettingsPage(activateLicense);

  return { licenseSettingsPage };
}

// ===========================================
// Entry point usage
// ===========================================

// In extension.ts:
// const { controller } = createExtension(settings);
// controller.enable();

// In prefs.ts:
// const { licenseSettingsPage } = createPrefsPage(settings);
// window.add(licenseSettingsPage);
