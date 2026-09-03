import { describe, expect, it } from 'vitest';
import {
  evaluateTrialWarning,
  formatTrialWarningMessage,
  NO_TRIAL_WARNING,
} from './trial-warning.js';

describe('evaluateTrialWarning', () => {
  it('does not warn while the trial has plenty of days left', () => {
    expect(
      evaluateTrialWarning({
        status: 'trial',
        trialDaysRemaining: 4,
        lastWarnedThreshold: NO_TRIAL_WARNING,
      })
    ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: NO_TRIAL_WARNING });
  });

  it('warns once when crossing the 3-day threshold', () => {
    expect(
      evaluateTrialWarning({
        status: 'trial',
        trialDaysRemaining: 3,
        lastWarnedThreshold: NO_TRIAL_WARNING,
      })
    ).toEqual({ thresholdToWarn: 3, lastWarnedThreshold: 3 });
  });

  it('does not re-fire the 3-day threshold on repeated evaluation', () => {
    expect(
      evaluateTrialWarning({ status: 'trial', trialDaysRemaining: 3, lastWarnedThreshold: 3 })
    ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: 3 });
  });

  it('does not re-fire the 3-day threshold when days keep counting down', () => {
    expect(
      evaluateTrialWarning({ status: 'trial', trialDaysRemaining: 2, lastWarnedThreshold: 3 })
    ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: 3 });
  });

  it('warns once when crossing the 1-day threshold after the 3-day one', () => {
    expect(
      evaluateTrialWarning({ status: 'trial', trialDaysRemaining: 1, lastWarnedThreshold: 3 })
    ).toEqual({ thresholdToWarn: 1, lastWarnedThreshold: 1 });
  });

  it('does not re-fire the 1-day threshold on repeated evaluation', () => {
    expect(
      evaluateTrialWarning({ status: 'trial', trialDaysRemaining: 1, lastWarnedThreshold: 1 })
    ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: 1 });
  });

  it('warns for the most urgent crossed threshold when no warning fired yet', () => {
    expect(
      evaluateTrialWarning({
        status: 'trial',
        trialDaysRemaining: 1,
        lastWarnedThreshold: NO_TRIAL_WARNING,
      })
    ).toEqual({ thresholdToWarn: 1, lastWarnedThreshold: 1 });
  });

  it('does not warn once the trial has run out', () => {
    expect(
      evaluateTrialWarning({ status: 'trial', trialDaysRemaining: 0, lastWarnedThreshold: 1 })
    ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: 1 });
  });

  it('resets the stored threshold when the status leaves trial', () => {
    for (const status of ['valid', 'expired', 'invalid'] as const) {
      expect(
        evaluateTrialWarning({ status, trialDaysRemaining: 1, lastWarnedThreshold: 3 })
      ).toEqual({ thresholdToWarn: null, lastWarnedThreshold: NO_TRIAL_WARNING });
    }
  });
});

describe('formatTrialWarningMessage', () => {
  it('uses the plural form for 3 days', () => {
    expect(formatTrialWarningMessage(3)).toBe(
      'Your Sutto trial ends in 3 days. Activate a license to keep using it.'
    );
  });

  it('uses the singular form for 1 day', () => {
    expect(formatTrialWarningMessage(1)).toBe(
      'Your Sutto trial ends in 1 day. Activate a license to keep using it.'
    );
  });
});
