import type { ActivationId } from './activation-id.js';
import type { LicenseKey } from './license-key.js';
import type { LicenseStatus } from './license-status.js';

export class InvalidLicenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLicenseError';
  }
}

export interface LicenseProps {
  licenseKey: LicenseKey;
  activationId: ActivationId;
  validUntil: Date;
  lastValidated: Date;
  status: LicenseStatus;
}

export class License {
  readonly licenseKey: LicenseKey;
  readonly activationId: ActivationId;
  /**
   * When the subscription period ends, as last confirmed by the license
   * server. Shown to the user, not used to decide access.
   */
  readonly validUntil: Date;
  readonly lastValidated: Date;
  readonly status: LicenseStatus;

  constructor(props: LicenseProps) {
    this.licenseKey = props.licenseKey;
    this.activationId = props.activationId;
    this.validUntil = props.validUntil;
    this.lastValidated = props.lastValidated;
    this.status = props.status;
  }

  isValid(): boolean {
    return this.status === 'valid';
  }

  withStatus(status: LicenseStatus): License {
    return new License({
      licenseKey: this.licenseKey,
      activationId: this.activationId,
      validUntil: this.validUntil,
      lastValidated: this.lastValidated,
      status,
    });
  }

  withValidation(validUntil: Date, lastValidated: Date): License {
    return new License({
      licenseKey: this.licenseKey,
      activationId: this.activationId,
      validUntil,
      lastValidated,
      status: this.status,
    });
  }
}
