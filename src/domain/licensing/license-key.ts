export class InvalidLicenseKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLicenseKeyError';
  }
}

const MAX_LENGTH = 256;

export class LicenseKey {
  private readonly value: string;

  constructor(value: string) {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new InvalidLicenseKeyError('License key cannot be empty');
    }
    if (trimmed.length > MAX_LENGTH) {
      throw new InvalidLicenseKeyError(`License key too long (max ${MAX_LENGTH} characters)`);
    }
    this.value = trimmed;
  }

  toString(): string {
    return this.value;
  }

  equals(other: LicenseKey): boolean {
    return this.value === other.value;
  }
}
