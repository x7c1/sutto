export class InvalidSpaceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSpaceIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Value object representing a validated space ID (UUID format)
 */
export class SpaceId {
  private constructor(private readonly value: string) {}

  static create(value: unknown): SpaceId {
    if (typeof value !== 'string') {
      throw new InvalidSpaceIdError('Space ID must be a string');
    }
    const trimmed = value.trim().toLowerCase();
    if (!UUID_REGEX.test(trimmed)) {
      throw new InvalidSpaceIdError(`Invalid UUID format: ${value}`);
    }
    return new SpaceId(trimmed);
  }

  static tryCreate(value: unknown): SpaceId | null {
    try {
      return SpaceId.create(value);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: SpaceId): boolean {
    return this.value === other.value;
  }
}
