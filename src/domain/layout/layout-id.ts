export class InvalidLayoutIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLayoutIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Value object representing a validated layout ID (UUID format)
 */
export class LayoutId {
  private constructor(private readonly value: string) {}

  static create(value: unknown): LayoutId {
    if (typeof value !== 'string') {
      throw new InvalidLayoutIdError('Layout ID must be a string');
    }
    const trimmed = value.trim().toLowerCase();
    if (!UUID_REGEX.test(trimmed)) {
      throw new InvalidLayoutIdError(`Invalid UUID format: ${value}`);
    }
    return new LayoutId(trimmed);
  }

  static tryCreate(value: unknown): LayoutId | null {
    try {
      return LayoutId.create(value);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: LayoutId): boolean {
    return this.value === other.value;
  }
}
