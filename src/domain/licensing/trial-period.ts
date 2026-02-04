import { TrialDays } from './trial-days.js';

export interface TrialPeriodProps {
  daysUsed: TrialDays;
  lastUsedDate: string;
}

export class TrialPeriod {
  readonly daysUsed: TrialDays;
  readonly lastUsedDate: string;

  constructor(props: TrialPeriodProps) {
    this.daysUsed = props.daysUsed;
    this.lastUsedDate = props.lastUsedDate;
  }

  static initial(): TrialPeriod {
    return new TrialPeriod({
      daysUsed: TrialDays.zero(),
      lastUsedDate: '',
    });
  }

  getRemainingDays(): number {
    return this.daysUsed.remaining();
  }

  isExpired(): boolean {
    return this.daysUsed.isExpired();
  }

  canRecordUsage(today: string): boolean {
    return this.lastUsedDate !== today && !this.isExpired();
  }

  recordUsage(today: string): TrialPeriod {
    if (!this.canRecordUsage(today)) {
      return this;
    }
    return new TrialPeriod({
      daysUsed: this.daysUsed.increment(),
      lastUsedDate: today,
    });
  }

  reset(): TrialPeriod {
    return TrialPeriod.initial();
  }
}
