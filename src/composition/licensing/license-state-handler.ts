/**
 * LicenseStateHandler
 *
 * Manages license initialization, state tracking, and validity checks.
 * Wraps LicenseOperations to provide a simple validity guard for the Controller.
 */

import type { LicenseOperations } from '../../operations/licensing/index.js';

declare function log(message: string): void;

export class LicenseStateHandler {
  private isLicenseValid: boolean = true;

  constructor(private readonly licenseOperations: LicenseOperations) {}

  initialize(onBecameInvalid: () => void): void {
    this.licenseOperations.onStateChange(() => {
      this.isLicenseValid = this.licenseOperations.shouldExtensionBeEnabled();
      if (!this.isLicenseValid) {
        log('[LicenseStateHandler] License invalid, notifying controller');
        onBecameInvalid();
      }
    });

    this.licenseOperations.initialize().then(() => {
      this.isLicenseValid = this.licenseOperations.shouldExtensionBeEnabled();
      if (!this.isLicenseValid) {
        log('[LicenseStateHandler] License invalid on startup, extension disabled');
      }
    });
  }

  isValid(): boolean {
    return this.isLicenseValid;
  }

  clearCallbacks(): void {
    this.licenseOperations.clearCallbacks();
  }
}
