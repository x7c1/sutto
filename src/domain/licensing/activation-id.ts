export class InvalidActivationIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidActivationIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Value object representing a validated activation ID (UUID format)
 */
export class ActivationId {
  private constructor(private readonly value: string) {}

  static create(value: unknown): ActivationId {
    if (typeof value !== 'string') {
      throw new InvalidActivationIdError('Activation ID must be a string');
    }
    const trimmed = value.trim().toLowerCase();
    if (!UUID_REGEX.test(trimmed)) {
      throw new InvalidActivationIdError(`Invalid UUID format: ${value}`);
    }
    return new ActivationId(trimmed);
  }

  static tryCreate(value: unknown): ActivationId | null {
    try {
      return ActivationId.create(value);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: ActivationId): boolean {
    return this.value === other.value;
  }
}
