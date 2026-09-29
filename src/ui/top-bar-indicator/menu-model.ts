/**
 * Top bar indicator menu model
 *
 * Decides what the indicator's popup menu shows, independently of St widgets,
 * so the rules can be unit-tested.
 */

import { getLicenseStatusDisplay, type LicenseState } from '../../domain/licensing/index.js';

export interface IndicatorMenuInput {
  /** Current license state, used for the status row and the purchase item. */
  readonly licenseState: LicenseState;
  /** Whether the license currently allows snapping windows. */
  readonly licenseValid: boolean;
  /** Whether a window has keyboard focus. */
  readonly hasFocusWindow: boolean;
  /** Whether the main panel is currently visible. */
  readonly panelVisible: boolean;
}

export interface IndicatorMenuModel {
  /**
   * Whether "Show Panel" can be activated. It mirrors the show-panel
   * shortcut: it hides a visible panel, shows the locked panel for an invalid
   * license, and otherwise needs a focused window to show the panel over.
   */
  readonly showPanelSensitive: boolean;
  /** Title of the non-interactive license status row. */
  readonly licenseTitle: string;
  /** Subtitle of the non-interactive license status row. */
  readonly licenseSubtitle: string;
  /** Whether "Purchase License…" is shown. */
  readonly showPurchaseItem: boolean;
}

export function buildIndicatorMenuModel(input: IndicatorMenuInput): IndicatorMenuModel {
  const { title, subtitle, showPurchaseLink } = getLicenseStatusDisplay(input.licenseState);
  return {
    showPanelSensitive: input.panelVisible || !input.licenseValid || input.hasFocusWindow,
    licenseTitle: title,
    licenseSubtitle: subtitle,
    showPurchaseItem: showPurchaseLink,
  };
}
