/**
 * LicenseStatusDisplay
 *
 * User-facing summary of a LicenseState, shared by every surface that shows
 * the license status (the preferences window and the top bar indicator).
 */

import { type LicenseState, OFFLINE_GRACE_PERIOD_DAYS } from './license-state.js';

export interface LicenseStatusDisplay {
  /** Short status, e.g. "Trial" or "Active". */
  readonly title: string;
  /** Detail line, e.g. "12 days remaining". */
  readonly subtitle: string;
  /** Whether the user should be offered a link to purchase a license. */
  readonly showPurchaseLink: boolean;
}

/**
 * Map a LicenseState to its user-facing title, subtitle and purchase-link flag.
 */
export function getLicenseStatusDisplay(state: LicenseState): LicenseStatusDisplay {
  const { status, networkState, trialDaysRemaining, validUntil, daysSinceLastValidation } = state;

  if (status === 'trial') {
    if (networkState === 'backend_unreachable') {
      return {
        title: 'Trial',
        subtitle: 'Server unavailable',
        showPurchaseLink: true,
      };
    }
    return {
      title: 'Trial',
      subtitle: `${trialDaysRemaining} days remaining`,
      showPurchaseLink: true,
    };
  }

  if (status === 'valid') {
    if (networkState === 'offline') {
      const daysUntilRequired = Math.ceil(OFFLINE_GRACE_PERIOD_DAYS - daysSinceLastValidation);
      return {
        title: 'Active',
        subtitle: `Offline - connect within ${daysUntilRequired} days`,
        showPurchaseLink: false,
      };
    }
    if (networkState === 'backend_unreachable') {
      return {
        title: 'Active',
        subtitle: 'Server unavailable',
        showPurchaseLink: false,
      };
    }
    const validUntilStr = validUntil ? formatDate(validUntil) : 'Unknown';
    return {
      title: 'Active',
      subtitle: `Valid until ${validUntilStr}`,
      showPurchaseLink: false,
    };
  }

  if (status === 'expired') {
    if (trialDaysRemaining === 0) {
      return {
        title: 'Trial Expired',
        subtitle: 'Please purchase a license',
        showPurchaseLink: true,
      };
    }
    return {
      title: 'Expired',
      subtitle: 'Please renew your subscription',
      showPurchaseLink: true,
    };
  }

  // status === 'invalid'
  return {
    title: 'Invalid',
    subtitle: state.errorMessage ?? 'License key is invalid',
    showPurchaseLink: true,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
