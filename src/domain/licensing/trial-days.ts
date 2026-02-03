export class InvalidTrialDaysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTrialDaysError';
  }
}

const MIN_DAYS = 0;
const MAX_DAYS = 30;

/**
 * Value object representing trial days used (0-30 range)
 */
export class TrialDays {
  static readonly LIMIT = MAX_DAYS;

  private constructor(private readonly value: number) {}

  static create(value: unknown): TrialDays {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new InvalidTrialDaysError('Trial days must be an integer');
    }
    if (value < MIN_DAYS || value > MAX_DAYS) {
      throw new InvalidTrialDaysError(`Trial days must be between ${MIN_DAYS} and ${MAX_DAYS}`);
    }
    return new TrialDays(value);
  }

  static tryCreate(value: unknown): TrialDays | null {
    try {
      return TrialDays.create(value);
    } catch {
      return null;
    }
  }

  static zero(): TrialDays {
    return new TrialDays(0);
  }

  increment(): TrialDays {
    if (this.value >= MAX_DAYS) {
      return this;
    }
    return new TrialDays(this.value + 1);
  }

  toNumber(): number {
    return this.value;
  }

  remaining(): number {
    return Math.max(0, MAX_DAYS - this.value);
  }

  isExpired(): boolean {
    return this.value >= MAX_DAYS;
  }

  equals(other: TrialDays): boolean {
    return this.value === other.value;
  }
}
