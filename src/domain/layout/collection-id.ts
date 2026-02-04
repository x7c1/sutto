export class InvalidCollectionIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCollectionIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CollectionId {
  private readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!UUID_REGEX.test(normalized)) {
      throw new InvalidCollectionIdError(`Invalid UUID format: ${value}`);
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }

  equals(other: CollectionId): boolean {
    return this.value === other.value;
  }
}
