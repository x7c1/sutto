/**
 * The outcome of one request to the license server.
 *
 * Every response is classified into exactly one of three outcomes:
 * - success: the server answered and accepted the request
 * - rejected: the server answered "no" with a known rejection reason
 * - no-response: anything else, including a server that is down or gone
 *
 * No response is never a rejection, so the license gate keeps working when
 * the license server is unavailable.
 */

/** Reason codes the license server gives when it rejects a request. */
export const LICENSE_REJECTION_REASONS = [
  'INVALID_LICENSE_KEY',
  'INVALID_ACTIVATION',
  'LICENSE_EXPIRED',
  'LICENSE_CANCELLED',
  'DEVICE_DEACTIVATED',
] as const;

export type LicenseRejectionReason = (typeof LICENSE_REJECTION_REASONS)[number];

export function isLicenseRejectionReason(value: unknown): value is LicenseRejectionReason {
  return (
    typeof value === 'string' && LICENSE_REJECTION_REASONS.includes(value as LicenseRejectionReason)
  );
}

export type LicenseServerOutcome<T> =
  | { readonly kind: 'success'; readonly data: T }
  | { readonly kind: 'rejected'; readonly reason: LicenseRejectionReason }
  | { readonly kind: 'no-response' };

export const LicenseServerOutcome = {
  succeeded: <T>(data: T): LicenseServerOutcome<T> => ({ kind: 'success', data }),
  rejected: <T>(reason: LicenseRejectionReason): LicenseServerOutcome<T> => ({
    kind: 'rejected',
    reason,
  }),
  noResponse: <T>(): LicenseServerOutcome<T> => ({ kind: 'no-response' }),
};
