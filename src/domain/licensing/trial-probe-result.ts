import type { LicenseServerOutcome } from './license-server-outcome.js';

/**
 * The result of the last time the license server was asked, after the Trial
 * Period ended, whether it is still there.
 *
 * - none: the license server has not been asked yet
 * - answered: the license server answered (accepted or rejected the request)
 * - no-response: the license server did not answer
 *
 * An ended trial is locked while the license server is running and opens once
 * it no longer answers, so retiring the server never strands anyone.
 */
export const TRIAL_PROBE_RESULTS = ['none', 'answered', 'no-response'] as const;
export type TrialProbeResult = (typeof TRIAL_PROBE_RESULTS)[number];

export function isValidTrialProbeResult(value: unknown): value is TrialProbeResult {
  return typeof value === 'string' && TRIAL_PROBE_RESULTS.includes(value as TrialProbeResult);
}

/**
 * Map the outcome of a probe request to the stored result: a success and a
 * rejection both mean the license server answered.
 */
export function trialProbeResultOf(outcome: LicenseServerOutcome<unknown>): TrialProbeResult {
  return outcome.kind === 'no-response' ? 'no-response' : 'answered';
}
