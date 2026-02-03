export class InvalidLicenseKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLicenseKeyError';
  }
}

/**
 * Value object representing a validated license key
 */
export class LicenseKey {
  private constructor(private readonly value: string) {}

  static create(value: unknown): LicenseKey {
    if (typeof value !== 'string') {
      throw new InvalidLicenseKeyError('License key must be a string');
    }
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new InvalidLicenseKeyError('License key cannot be empty');
    }
    return new LicenseKey(trimmed);
  }

  static tryCreate(value: unknown): LicenseKey | null {
    try {
      return LicenseKey.create(value);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: LicenseKey): boolean {
    return this.value === other.value;
  }
}
