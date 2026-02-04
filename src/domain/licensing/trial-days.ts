export class InvalidTrialDaysError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTrialDaysError';
  }
}

const MIN_DAYS = 0;
const MAX_DAYS = 30;

export class TrialDays {
  static readonly LIMIT = MAX_DAYS;

  private readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new InvalidTrialDaysError('Trial days must be an integer');
    }
    if (value < MIN_DAYS || value > MAX_DAYS) {
      throw new InvalidTrialDaysError(`Trial days must be between ${MIN_DAYS} and ${MAX_DAYS}`);
    }
    this.value = value;
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
