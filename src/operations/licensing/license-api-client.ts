import type {
  ActivationId,
  ActivationResult,
  DeviceId,
  LicenseKey,
} from '../../domain/licensing/index.js';
import { type LicenseRejectionReason, LicenseServerOutcome } from '../../domain/licensing/index.js';

/**
 * Interface for license API operations
 * Infrastructure layer implements this interface with HTTP calls
 */
export interface LicenseApiClient {
  /**
   * Activate a license key for a device
   */
  activate(
    licenseKey: LicenseKey,
    deviceId: DeviceId,
    deviceLabel: string
  ): Promise<ActivationResult>;

  /**
   * Validate an existing activation
   */
  validate(licenseKey: LicenseKey, activationId: ActivationId): Promise<ValidationResult>;
}

export interface ValidationSuccess {
  validUntil: Date;
  subscriptionStatus: string;
}

/** The outcome of a validation request to the license server. */
export type ValidationResult = LicenseServerOutcome<ValidationSuccess>;

export const ValidationResult = {
  succeeded: (data: ValidationSuccess): ValidationResult => LicenseServerOutcome.succeeded(data),
  rejected: (reason: LicenseRejectionReason): ValidationResult =>
    LicenseServerOutcome.rejected(reason),
  noResponse: (): ValidationResult => LicenseServerOutcome.noResponse(),
};
