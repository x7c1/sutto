import type { ActivationId } from './activation-id.js';
import { type LicenseRejectionReason, LicenseServerOutcome } from './license-server-outcome.js';

export interface ActivationSuccessData {
  activationId: ActivationId;
  validUntil: Date;
  devicesUsed: number;
  devicesLimit: number;
  deactivatedDevice: string | null;
}

/** The outcome of an activation request to the license server. */
export type ActivationResult = LicenseServerOutcome<ActivationSuccessData>;

export const ActivationResult = {
  succeeded: (data: ActivationSuccessData): ActivationResult =>
    LicenseServerOutcome.succeeded(data),
  rejected: (reason: LicenseRejectionReason): ActivationResult =>
    LicenseServerOutcome.rejected(reason),
  noResponse: (): ActivationResult => LicenseServerOutcome.noResponse(),
};
