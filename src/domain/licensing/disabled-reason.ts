/**
 * DisabledReason
 *
 * Why the extension is not allowed to snap windows right now.
 * `null` (used by callers) means the extension is enabled.
 */

export const DISABLED_REASONS = [
  'trial-expired',
  'license-expired',
  'license-invalid',
  'offline-grace-exceeded',
] as const;

export type DisabledReason = (typeof DISABLED_REASONS)[number];

/**
 * User-facing description of a DisabledReason, shown in the locked main panel.
 */
export interface DisabledReasonDescription {
  /** What happened, e.g. "Your Sutto license has expired." */
  readonly headline: string;
  /** What to do about it. Rendered on its own line below the headline. */
  readonly instruction: string;
  /**
   * Whether an "Open Preferences" action can resolve the reason.
   * False for reasons the user cannot fix from the preferences window.
   */
  readonly canOpenPreferences: boolean;
}

const DESCRIPTIONS: Record<DisabledReason, DisabledReasonDescription> = {
  'trial-expired': {
    headline: 'Your Sutto trial has ended.',
    instruction: 'Activate a license to keep snapping windows.',
    canOpenPreferences: true,
  },
  'license-expired': {
    headline: 'Your Sutto license has expired.',
    instruction: 'Re-activate it to continue.',
    canOpenPreferences: true,
  },
  'license-invalid': {
    headline: 'Your Sutto license is no longer valid.',
    instruction: 'Re-activate it to continue.',
    canOpenPreferences: true,
  },
  'offline-grace-exceeded': {
    headline: "Sutto couldn't verify your license.",
    instruction: 'Reconnect to the internet to continue.',
    canOpenPreferences: false,
  },
};

/**
 * Map a DisabledReason to its user-facing copy and action applicability.
 */
export function describeDisabledReason(reason: DisabledReason): DisabledReasonDescription {
  return DESCRIPTIONS[reason];
}
