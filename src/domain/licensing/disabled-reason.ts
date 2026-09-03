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
  /** Sentence explaining what happened and what to do about it. */
  readonly message: string;
  /**
   * Whether an "Open Preferences" action can resolve the reason.
   * False for reasons the user cannot fix from the preferences window.
   */
  readonly canOpenPreferences: boolean;
}

const DESCRIPTIONS: Record<DisabledReason, DisabledReasonDescription> = {
  'trial-expired': {
    message: 'Your Sutto trial has ended. Activate a license to keep snapping windows.',
    canOpenPreferences: true,
  },
  'license-expired': {
    message: 'Your Sutto license has expired. Re-activate it to continue.',
    canOpenPreferences: true,
  },
  'license-invalid': {
    message: 'Your Sutto license is no longer valid. Re-activate it to continue.',
    canOpenPreferences: true,
  },
  'offline-grace-exceeded': {
    message: "Sutto couldn't verify your license. Reconnect to the internet to continue.",
    canOpenPreferences: false,
  },
};

/**
 * Map a DisabledReason to its user-facing message and action applicability.
 */
export function describeDisabledReason(reason: DisabledReason): DisabledReasonDescription {
  return DESCRIPTIONS[reason];
}
