/**
 * License Status: the current state of the licensing system.
 *
 * - trial: within the Trial Period, no License activated
 * - trial-expired: the Trial Period has ended and no License was activated
 * - valid: an active License with a valid subscription
 * - expired: the license server reports that the License subscription ended or
 *   was cancelled, or that this device's activation was deactivated
 * - invalid: the license server rejected the License Key or the activation
 *
 * Only an answer from the license server produces expired or invalid.
 */
export const LICENSE_STATUSES = ['trial', 'trial-expired', 'valid', 'expired', 'invalid'] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export function isValidLicenseStatus(value: unknown): value is LicenseStatus {
  return typeof value === 'string' && LICENSE_STATUSES.includes(value as LicenseStatus);
}

export class InvalidLicenseStatusError extends Error {
  constructor(value: unknown) {
    super(`Invalid license status: ${value}`);
    this.name = 'InvalidLicenseStatusError';
  }
}

export function parseLicenseStatus(value: unknown): LicenseStatus {
  if (isValidLicenseStatus(value)) {
    return value;
  }
  throw new InvalidLicenseStatusError(value);
}
