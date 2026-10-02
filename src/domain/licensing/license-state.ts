import type { LicenseStatus } from './license-status.js';
import type { NetworkState } from './network-state.js';

/**
 * Days a valid license keeps working offline, counted from the last time the
 * device was online (whether or not the license server answered).
 */
export const OFFLINE_GRACE_PERIOD_DAYS = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface LicenseState {
  readonly status: LicenseStatus;
  readonly networkState: NetworkState;
  readonly trialDaysRemaining: number;
  readonly validUntil: Date | null;
  /** Days since the device was last seen online. */
  readonly daysSinceLastOnline: number;
  readonly errorMessage?: string;
}

export function createLicenseState(props: LicenseState): LicenseState {
  return Object.freeze(props);
}

/**
 * Days elapsed from `lastOnlineAt` to `now`, never negative.
 */
export function daysSinceLastOnline(lastOnlineAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - lastOnlineAt.getTime()) / MILLISECONDS_PER_DAY);
}
