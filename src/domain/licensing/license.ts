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

  isExpired(): boolean {
    return this.status === 'expired' || this.validUntil.getTime() < Date.now();
  }

  daysSinceLastValidation(): number {
    const now = Date.now();
    const diff = now - this.lastValidated.getTime();
    return diff / (24 * 60 * 60 * 1000);
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
