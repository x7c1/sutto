export class InvalidDeviceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDeviceIdError';
  }
}

// systemd's /etc/machine-id is 32 hex chars, but non-systemd systems (e.g., Alpine)
// may use different formats, so we only enforce a reasonable upper bound here.
const MAX_LENGTH = 256;
const UNKNOWN_DEVICE = 'unknown-device';

export class DeviceId {
  private readonly value: string;

  constructor(value: string) {
    if (value === UNKNOWN_DEVICE) {
      this.value = value;
      return;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === '') {
      throw new InvalidDeviceIdError('Device ID cannot be empty');
    }
    if (normalized.length > MAX_LENGTH) {
      throw new InvalidDeviceIdError(`Device ID too long (max ${MAX_LENGTH} characters)`);
    }
    this.value = normalized;
  }

  static unknown(): DeviceId {
    return new DeviceId(UNKNOWN_DEVICE);
  }

  toString(): string {
    return this.value;
  }

  equals(other: DeviceId): boolean {
    return this.value === other.value;
  }

  isUnknown(): boolean {
    return this.value === UNKNOWN_DEVICE;
  }
}
