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
  /** Detail line, e.g. "12 days of use left". */
  readonly subtitle: string;
  /** Whether the user should be offered a link to purchase a license. */
  readonly showPurchaseLink: boolean;
}

/**
 * Map a LicenseState to its user-facing title, subtitle and purchase-link flag.
 */
export function getLicenseStatusDisplay(state: LicenseState): LicenseStatusDisplay {
  const { status, networkState, trialDaysRemaining, daysSinceLastOnline } = state;

  if (status === 'trial') {
    return {
      title: 'Trial',
      subtitle: `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} of use left`,
      showPurchaseLink: true,
    };
  }

  if (status === 'valid') {
    if (networkState === 'offline') {
      const daysUntilRequired = Math.ceil(OFFLINE_GRACE_PERIOD_DAYS - daysSinceLastOnline);
      // Once the grace period has run out there is no day count left to show.
      const subtitle =
        daysUntilRequired > 0
          ? `Offline - connect within ${daysUntilRequired} days`
          : 'Offline - reconnect to the internet to continue';
      return {
        title: 'Active',
        subtitle,
        showPurchaseLink: false,
      };
    }
    return {
      title: 'Active',
      subtitle: validLicenseSubtitle(state),
      showPurchaseLink: false,
    };
  }

  // Shown the same whether or not the license gate is open: an ended trial
  // that opens because the license server no longer answers is still ended.
  if (status === 'trial-expired') {
    return {
      title: 'Trial Expired',
      subtitle: 'Please purchase a license',
      showPurchaseLink: true,
    };
  }

  if (status === 'expired') {
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

/**
 * Subtitle of a valid License while online. The valid-until date is only
 * refreshed by a successful validation, so once it has passed (the license
 * server stopped answering) the last validation is what is actually known.
 */
function validLicenseSubtitle(state: LicenseState): string {
  const { validUntil, validUntilPassed, lastValidated } = state;
  if (!validUntilPassed) {
    return `Valid until ${validUntil ? formatDate(validUntil) : 'Unknown'}`;
  }
  return lastValidated ? `Last verified ${formatDate(lastValidated)}` : 'Not verified yet';
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
