export class InvalidDeviceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDeviceIdError';
  }
}

const MACHINE_ID_REGEX = /^[0-9a-f]{32}$/i;

/**
 * Value object representing a validated device ID (machine-id format)
 */
export class DeviceId {
  private constructor(private readonly value: string) {}

  static create(value: unknown): DeviceId {
    if (typeof value !== 'string') {
      throw new InvalidDeviceIdError('Device ID must be a string');
    }
    const trimmed = value.trim().toLowerCase();
    if (!MACHINE_ID_REGEX.test(trimmed)) {
      throw new InvalidDeviceIdError(`Invalid machine-id format: ${value}`);
    }
    return new DeviceId(trimmed);
  }

  static tryCreate(value: unknown): DeviceId | null {
    try {
      return DeviceId.create(value);
    } catch {
      return null;
    }
  }

  static unknown(): DeviceId {
    return new DeviceId('unknown-device');
  }

  toString(): string {
    return this.value;
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  isUnknown(): boolean {
    return this.value === 'unknown-device';
  }
}
