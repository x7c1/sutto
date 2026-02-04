export class InvalidSpaceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSpaceIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SpaceId {
  private readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!UUID_REGEX.test(normalized)) {
      throw new InvalidSpaceIdError(`Invalid UUID format: ${value}`);
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }

  equals(other: SpaceId): boolean {
    return this.value === other.value;
  }
}
