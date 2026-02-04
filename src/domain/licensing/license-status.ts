export const LICENSE_STATUSES = ['trial', 'valid', 'expired', 'invalid'] as const;
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
