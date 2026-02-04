export class InvalidLayoutIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLayoutIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class LayoutId {
  private readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!UUID_REGEX.test(normalized)) {
      throw new InvalidLayoutIdError(`Invalid UUID format: ${value}`);
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }

  equals(other: LayoutId): boolean {
    return this.value === other.value;
  }
}
