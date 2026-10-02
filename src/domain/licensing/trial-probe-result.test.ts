import { describe, expect, it } from 'vitest';
import { LicenseServerOutcome } from './license-server-outcome.js';
import { isValidTrialProbeResult, trialProbeResultOf } from './trial-probe-result.js';

describe('trialProbeResultOf', () => {
  it('is answered for a success', () => {
    expect(trialProbeResultOf(LicenseServerOutcome.succeeded({}))).toBe('answered');
  });

  it('is answered for a rejection', () => {
    expect(trialProbeResultOf(LicenseServerOutcome.rejected('INVALID_LICENSE_KEY'))).toBe(
      'answered'
    );
  });

  it('is no-response for no response', () => {
    expect(trialProbeResultOf(LicenseServerOutcome.noResponse())).toBe('no-response');
  });
});

describe('isValidTrialProbeResult', () => {
  it.each(['none', 'answered', 'no-response'])('accepts %s', (value) => {
    expect(isValidTrialProbeResult(value)).toBe(true);
  });

  it.each(['', 'unknown', 0, null])('rejects %s', (value) => {
    expect(isValidTrialProbeResult(value)).toBe(false);
  });
});
