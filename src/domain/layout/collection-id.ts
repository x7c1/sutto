export class InvalidCollectionIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCollectionIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Value object representing a validated collection ID (UUID format)
 */
export class CollectionId {
  private constructor(private readonly value: string) {}

  static create(value: unknown): CollectionId {
    if (typeof value !== 'string') {
      throw new InvalidCollectionIdError('Collection ID must be a string');
    }
    const trimmed = value.trim().toLowerCase();
    if (!UUID_REGEX.test(trimmed)) {
      throw new InvalidCollectionIdError(`Invalid UUID format: ${value}`);
    }
    return new CollectionId(trimmed);
  }

  static tryCreate(value: unknown): CollectionId | null {
    try {
      return CollectionId.create(value);
    } catch {
      return null;
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: CollectionId): boolean {
    return this.value === other.value;
  }
}
