import { describe, expect, it } from 'vitest';
import { createLicenseState, type LicenseState } from './license-state.js';
import { getLicenseStatusDisplay } from './license-status-display.js';

function state(overrides: Partial<LicenseState>): LicenseState {
  return createLicenseState({
    status: 'trial',
    networkState: 'online',
    trialDaysRemaining: 12,
    validUntil: null,
    validUntilPassed: false,
    lastValidated: null,
    daysSinceLastOnline: 0,
    ...overrides,
  });
}

describe('getLicenseStatusDisplay', () => {
  it('shows the remaining trial days while online', () => {
    expect(getLicenseStatusDisplay(state({ status: 'trial', trialDaysRemaining: 12 }))).toEqual({
      title: 'Trial',
      subtitle: '12 days of use left',
      showPurchaseLink: true,
    });
  });

  it('uses the singular form for one remaining trial day', () => {
    expect(getLicenseStatusDisplay(state({ status: 'trial', trialDaysRemaining: 1 }))).toEqual({
      title: 'Trial',
      subtitle: '1 day of use left',
      showPurchaseLink: true,
    });
  });

  it('shows the remaining trial days while offline', () => {
    expect(getLicenseStatusDisplay(state({ status: 'trial', networkState: 'offline' }))).toEqual({
      title: 'Trial',
      subtitle: '12 days of use left',
      showPurchaseLink: true,
    });
  });

  it('shows the valid-until date of a valid license while online', () => {
    expect(
      getLicenseStatusDisplay(
        state({
          status: 'valid',
          validUntil: new Date(2026, 9, 5),
          validUntilPassed: false,
          lastValidated: new Date(2026, 8, 1),
        })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Valid until 2026-10-05',
      showPurchaseLink: false,
    });
  });

  it('shows an unknown valid-until date when a valid license has none', () => {
    expect(getLicenseStatusDisplay(state({ status: 'valid', validUntil: null }))).toEqual({
      title: 'Active',
      subtitle: 'Valid until Unknown',
      showPurchaseLink: false,
    });
  });

  it('shows the last verified date once the valid-until date has passed', () => {
    expect(
      getLicenseStatusDisplay(
        state({
          status: 'valid',
          validUntil: new Date(2026, 8, 30),
          validUntilPassed: true,
          lastValidated: new Date(2026, 8, 1),
        })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Last verified 2026-09-01',
      showPurchaseLink: false,
    });
  });

  it('shows not verified yet once the valid-until date has passed without a last validated date', () => {
    expect(
      getLicenseStatusDisplay(
        state({
          status: 'valid',
          validUntil: new Date(2026, 8, 30),
          validUntilPassed: true,
          lastValidated: null,
        })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Not verified yet',
      showPurchaseLink: false,
    });
  });

  it('keeps the offline subtitle once the valid-until date has passed', () => {
    expect(
      getLicenseStatusDisplay(
        state({
          status: 'valid',
          networkState: 'offline',
          daysSinceLastOnline: 3.5,
          validUntil: new Date(2026, 8, 30),
          validUntilPassed: true,
          lastValidated: new Date(2026, 8, 1),
        })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Offline - connect within 4 days',
      showPurchaseLink: false,
    });
  });

  it('shows the remaining offline grace days of a valid license', () => {
    expect(
      getLicenseStatusDisplay(
        state({ status: 'valid', networkState: 'offline', daysSinceLastOnline: 3.5 })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Offline - connect within 4 days',
      showPurchaseLink: false,
    });
  });

  it('asks to reconnect instead of counting days once the offline grace period has run out', () => {
    expect(
      getLicenseStatusDisplay(
        state({ status: 'valid', networkState: 'offline', daysSinceLastOnline: 10 })
      )
    ).toEqual({
      title: 'Active',
      subtitle: 'Offline - reconnect to the internet to continue',
      showPurchaseLink: false,
    });
  });

  it.each([
    'online',
    'offline',
  ] as const)('asks to purchase a license after the trial ended, while %s', (networkState) => {
    expect(
      getLicenseStatusDisplay(
        state({
          status: 'trial-expired',
          networkState,
          trialDaysRemaining: 0,
          daysSinceLastOnline: 10,
        })
      )
    ).toEqual({
      title: 'Trial Expired',
      subtitle: 'Please purchase a license',
      showPurchaseLink: true,
    });
  });

  it.each([
    0, 5,
  ])('asks to renew an expired subscription with %i trial days of use left', (trialDaysRemaining) => {
    expect(getLicenseStatusDisplay(state({ status: 'expired', trialDaysRemaining }))).toEqual({
      title: 'Expired',
      subtitle: 'Please renew your subscription',
      showPurchaseLink: true,
    });
  });

  it('shows the error message of an invalid license', () => {
    expect(
      getLicenseStatusDisplay(state({ status: 'invalid', errorMessage: 'Device limit reached' }))
    ).toEqual({
      title: 'Invalid',
      subtitle: 'Device limit reached',
      showPurchaseLink: true,
    });
  });

  it('falls back to a generic message for an invalid license without an error', () => {
    expect(getLicenseStatusDisplay(state({ status: 'invalid' }))).toEqual({
      title: 'Invalid',
      subtitle: 'License key is invalid',
      showPurchaseLink: true,
    });
  });
});
