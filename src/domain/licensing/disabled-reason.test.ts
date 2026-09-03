import { describe, expect, it } from 'vitest';
import type { DisabledReason } from './disabled-reason.js';
import { DISABLED_REASONS, describeDisabledReason } from './disabled-reason.js';

describe('describeDisabledReason', () => {
  it('describes trial-expired with an Open Preferences action', () => {
    expect(describeDisabledReason('trial-expired')).toEqual({
      headline: 'Your Sutto trial has ended.',
      instruction: 'Activate a license to keep snapping windows.',
      canOpenPreferences: true,
    });
  });

  it('describes license-expired with an Open Preferences action', () => {
    expect(describeDisabledReason('license-expired')).toEqual({
      headline: 'Your Sutto license has expired.',
      instruction: 'Re-activate it to continue.',
      canOpenPreferences: true,
    });
  });

  it('describes license-invalid with an Open Preferences action', () => {
    expect(describeDisabledReason('license-invalid')).toEqual({
      headline: 'Your Sutto license is no longer valid.',
      instruction: 'Re-activate it to continue.',
      canOpenPreferences: true,
    });
  });

  it('describes offline-grace-exceeded without an action', () => {
    expect(describeDisabledReason('offline-grace-exceeded')).toEqual({
      headline: "Sutto couldn't verify your license.",
      instruction: 'Reconnect to the internet to continue.',
      canOpenPreferences: false,
    });
  });

  it('returns a non-empty headline and instruction for every reason', () => {
    for (const reason of DISABLED_REASONS satisfies readonly DisabledReason[]) {
      const { headline, instruction } = describeDisabledReason(reason);
      expect(headline.length).toBeGreaterThan(0);
      expect(instruction.length).toBeGreaterThan(0);
    }
  });
});
