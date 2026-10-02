import { describe, expect, it } from 'vitest';
import { createLicenseState, type LicenseState } from '../../domain/licensing/index.js';
import { buildIndicatorMenuModel, type IndicatorMenuInput } from './menu-model.js';

function licenseState(overrides: Partial<LicenseState> = {}): LicenseState {
  return createLicenseState({
    status: 'valid',
    networkState: 'online',
    trialDaysRemaining: 0,
    validUntil: new Date(2026, 9, 5),
    validUntilPassed: false,
    lastValidated: new Date(2026, 8, 5),
    daysSinceLastOnline: 0,
    ...overrides,
  });
}

function input(overrides: Partial<IndicatorMenuInput> = {}): IndicatorMenuInput {
  return {
    licenseState: licenseState(),
    licenseValid: true,
    hasFocusWindow: true,
    panelVisible: false,
    ...overrides,
  };
}

describe('buildIndicatorMenuModel', () => {
  describe('Show Panel sensitivity', () => {
    const cases: Array<{
      licenseValid: boolean;
      hasFocusWindow: boolean;
      panelVisible: boolean;
      expected: boolean;
    }> = [
      // Valid license: needs a focused window unless the panel is already visible
      { licenseValid: true, hasFocusWindow: true, panelVisible: false, expected: true },
      { licenseValid: true, hasFocusWindow: false, panelVisible: false, expected: false },
      { licenseValid: true, hasFocusWindow: true, panelVisible: true, expected: true },
      { licenseValid: true, hasFocusWindow: false, panelVisible: true, expected: true },
      // Invalid license: the locked panel needs no window
      { licenseValid: false, hasFocusWindow: true, panelVisible: false, expected: true },
      { licenseValid: false, hasFocusWindow: false, panelVisible: false, expected: true },
      { licenseValid: false, hasFocusWindow: true, panelVisible: true, expected: true },
      { licenseValid: false, hasFocusWindow: false, panelVisible: true, expected: true },
    ];

    it.each(
      cases
    )('is $expected when licenseValid=$licenseValid, hasFocusWindow=$hasFocusWindow, panelVisible=$panelVisible', ({
      licenseValid,
      hasFocusWindow,
      panelVisible,
      expected,
    }) => {
      const model = buildIndicatorMenuModel(input({ licenseValid, hasFocusWindow, panelVisible }));
      expect(model.showPanelSensitive).toBe(expected);
    });
  });

  describe('Purchase License item', () => {
    it('is shown during the trial', () => {
      const model = buildIndicatorMenuModel(
        input({ licenseState: licenseState({ status: 'trial', trialDaysRemaining: 12 }) })
      );
      expect(model.showPurchaseItem).toBe(true);
    });

    it('is hidden for a valid license', () => {
      const model = buildIndicatorMenuModel(
        input({ licenseState: licenseState({ status: 'valid' }) })
      );
      expect(model.showPurchaseItem).toBe(false);
    });

    it('is shown for an expired license', () => {
      const model = buildIndicatorMenuModel(
        input({ licenseValid: false, licenseState: licenseState({ status: 'expired' }) })
      );
      expect(model.showPurchaseItem).toBe(true);
    });

    it('is shown for an invalid license', () => {
      const model = buildIndicatorMenuModel(
        input({ licenseValid: false, licenseState: licenseState({ status: 'invalid' }) })
      );
      expect(model.showPurchaseItem).toBe(true);
    });
  });

  describe('license status row', () => {
    it('uses the same title and subtitle as the preferences window', () => {
      const model = buildIndicatorMenuModel(
        input({ licenseState: licenseState({ status: 'trial', trialDaysRemaining: 12 }) })
      );
      expect(model.licenseTitle).toBe('Trial');
      expect(model.licenseSubtitle).toBe('12 days of use left');
    });
  });
});
