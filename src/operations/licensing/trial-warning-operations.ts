import { evaluateTrialWarning, formatTrialWarningMessage } from '../../domain/licensing/index.js';
import type { NotificationService } from '../notification/index.js';
import type { LicenseRepository } from './license-repository.js';

declare function log(message: string): void;

const WARNING_TITLE = 'Trial ending soon';

/**
 * Warns the user before the trial ends.
 *
 * Evaluated at startup only: the trial day count advances at startup, so a
 * threshold can never be crossed mid-session.
 */
export class TrialWarningOperations {
  constructor(
    private readonly repository: LicenseRepository,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Notify the user if the trial just crossed a warning threshold, and persist
   * the threshold so it does not fire again on the next login.
   */
  checkAndNotify(): void {
    const trial = this.repository.loadTrialPeriod();
    const trialDaysRemaining = trial.getRemainingDays();
    const lastWarnedThreshold = this.repository.getTrialWarningThreshold();

    const decision = evaluateTrialWarning({
      status: this.repository.getStatus(),
      trialDaysRemaining,
      lastWarnedThreshold,
    });

    if (decision.lastWarnedThreshold !== lastWarnedThreshold) {
      this.repository.setTrialWarningThreshold(decision.lastWarnedThreshold);
    }

    if (decision.thresholdToWarn === null) {
      return;
    }

    log(`[TrialWarningOperations] Trial ends in ${trialDaysRemaining} day(s), warning user`);
    this.notificationService.notifyWarning(
      WARNING_TITLE,
      formatTrialWarningMessage(trialDaysRemaining)
    );
  }
}
