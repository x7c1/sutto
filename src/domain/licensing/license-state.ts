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
  /** When the subscription period ends, as last confirmed by the license server; shown, not used to decide access. */
  readonly validUntil: Date | null;
  /**
   * Whether the valid-until date lies before today. A valid License keeps
   * working past it while the license server does not answer.
   */
  readonly validUntilPassed: boolean;
  /** When the License was last validated with the license server, if ever. */
  readonly lastValidated: Date | null;
  /** Days since the device was last seen online. */
  readonly daysSinceLastOnline: number;
  readonly errorMessage?: string;
}

export function createLicenseState(props: LicenseState): LicenseState {
  return Object.freeze(props);
}

/**
 * Whether `validUntil` lies before the local day of `now`. A valid-until date
 * of today has not passed yet.
 */
export function isValidUntilPassed(validUntil: Date, now: Date): boolean {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return validUntil.getTime() < startOfToday.getTime();
}

/**
 * Days elapsed from `lastOnlineAt` to `now`, never negative.
 */
export function daysSinceLastOnline(lastOnlineAt: Date, now: Date): number {
  return Math.max(0, (now.getTime() - lastOnlineAt.getTime()) / MILLISECONDS_PER_DAY);
}
