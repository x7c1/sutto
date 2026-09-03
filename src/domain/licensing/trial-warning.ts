/**
 * Trial pre-expiry warning
 *
 * Decides whether the user should be warned that the trial is about to end.
 * The decision is pure: the caller supplies the current status, the remaining
 * trial days and the threshold that was last warned about, and persists the
 * returned threshold so a warning fires at most once per trial.
 */

import type { LicenseStatus } from './license-status.js';

/**
 * Remaining-day thresholds that trigger a warning, most relaxed first.
 */
export const TRIAL_WARNING_THRESHOLDS = [3, 1] as const;

/**
 * Stored value meaning "no threshold has been warned about yet".
 */
export const NO_TRIAL_WARNING = 0;

export interface TrialWarningInput {
  readonly status: LicenseStatus;
  readonly trialDaysRemaining: number;
  /** Threshold already warned about, or NO_TRIAL_WARNING when none. */
  readonly lastWarnedThreshold: number;
}

export interface TrialWarningDecision {
  /** Threshold to warn about now, or null when no warning is due. */
  readonly thresholdToWarn: number | null;
  /** Value the caller must persist as the new last-warned threshold. */
  readonly lastWarnedThreshold: number;
}

/**
 * Evaluate whether a pre-expiry trial warning is due.
 *
 * Outside of an active trial the stored threshold is reset, so a later trial
 * (or a re-activated license that lapses back to trial) warns again.
 */
export function evaluateTrialWarning(input: TrialWarningInput): TrialWarningDecision {
  if (input.status !== 'trial') {
    return { thresholdToWarn: null, lastWarnedThreshold: NO_TRIAL_WARNING };
  }

  // The trial has already run out; the locked panel explains it instead.
  if (input.trialDaysRemaining <= 0) {
    return { thresholdToWarn: null, lastWarnedThreshold: input.lastWarnedThreshold };
  }

  // Most urgent threshold the remaining days have crossed.
  const crossed = TRIAL_WARNING_THRESHOLDS.filter(
    (threshold) => input.trialDaysRemaining <= threshold
  );
  const threshold = crossed.length > 0 ? Math.min(...crossed) : null;

  if (threshold === null) {
    return { thresholdToWarn: null, lastWarnedThreshold: input.lastWarnedThreshold };
  }

  // Remaining days only decrease, so the stored threshold only decreases:
  // a threshold at or above the stored one has already been warned about.
  const alreadyWarned =
    input.lastWarnedThreshold !== NO_TRIAL_WARNING && threshold >= input.lastWarnedThreshold;
  if (alreadyWarned) {
    return { thresholdToWarn: null, lastWarnedThreshold: input.lastWarnedThreshold };
  }

  return { thresholdToWarn: threshold, lastWarnedThreshold: threshold };
}

/**
 * User-facing body of the pre-expiry warning notification.
 */
export function formatTrialWarningMessage(daysRemaining: number): string {
  const unit = daysRemaining === 1 ? 'day' : 'days';
  return `Your Sutto trial ends in ${daysRemaining} ${unit}. Activate a license to keep using it.`;
}
