export class InvalidActivationIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidActivationIdError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ActivationId {
  private readonly value: string;

  constructor(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!UUID_REGEX.test(normalized)) {
      throw new InvalidActivationIdError(`Invalid UUID format: ${value}`);
    }
    this.value = normalized;
  }

  toString(): string {
    return this.value;
  }

  equals(other: ActivationId): boolean {
    return this.value === other.value;
  }
}
