import { TrialDays } from './trial-days.js';

export interface TrialProps {
  daysUsed: TrialDays;
  lastUsedDate: string;
}

/**
 * Entity representing trial period state
 */
export class Trial {
  readonly daysUsed: TrialDays;
  readonly lastUsedDate: string;

  private constructor(props: TrialProps) {
    this.daysUsed = props.daysUsed;
    this.lastUsedDate = props.lastUsedDate;
  }

  static create(props: TrialProps): Trial {
    return new Trial(props);
  }

  static initial(): Trial {
    return new Trial({
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

  recordUsage(today: string): Trial {
    if (!this.canRecordUsage(today)) {
      return this;
    }
    return new Trial({
      daysUsed: this.daysUsed.increment(),
      lastUsedDate: today,
    });
  }

  reset(): Trial {
    return Trial.initial();
  }
}
