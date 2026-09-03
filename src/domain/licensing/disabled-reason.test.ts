import { describe, expect, it } from 'vitest';
import type { DisabledReason } from './disabled-reason.js';
import { DISABLED_REASONS, describeDisabledReason } from './disabled-reason.js';

describe('describeDisabledReason', () => {
  it('describes trial-expired with an Open Preferences action', () => {
    expect(describeDisabledReason('trial-expired')).toEqual({
      message: 'Your Sutto trial has ended. Activate a license to keep snapping windows.',
      canOpenPreferences: true,
    });
  });

  it('describes license-expired with an Open Preferences action', () => {
    expect(describeDisabledReason('license-expired')).toEqual({
      message: 'Your Sutto license has expired. Re-activate it to continue.',
      canOpenPreferences: true,
    });
  });

  it('describes license-invalid with an Open Preferences action', () => {
    expect(describeDisabledReason('license-invalid')).toEqual({
      message: 'Your Sutto license is no longer valid. Re-activate it to continue.',
      canOpenPreferences: true,
    });
  });

  it('describes offline-grace-exceeded without an action', () => {
    expect(describeDisabledReason('offline-grace-exceeded')).toEqual({
      message: "Sutto couldn't verify your license. Reconnect to the internet to continue.",
      canOpenPreferences: false,
    });
  });

  it('returns a non-empty message for every reason', () => {
    for (const reason of DISABLED_REASONS satisfies readonly DisabledReason[]) {
      expect(describeDisabledReason(reason).message.length).toBeGreaterThan(0);
    }
  });
});
