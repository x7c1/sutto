import type { LicenseStatus } from './license-status.js';
import type { NetworkState } from './network-state.js';

/** Days a valid license may go without a successful online validation. */
export const OFFLINE_GRACE_PERIOD_DAYS = 7;

export interface LicenseState {
  readonly status: LicenseStatus;
  readonly networkState: NetworkState;
  readonly trialDaysRemaining: number;
  readonly validUntil: Date | null;
  readonly daysSinceLastValidation: number;
  readonly errorMessage?: string;
}

export function createLicenseState(props: LicenseState): LicenseState {
  return Object.freeze(props);
}
