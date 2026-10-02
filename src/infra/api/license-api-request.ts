/**
 * Request paths and bodies sent to the license server.
 *
 * Kept free of GJS imports so it can be unit tested without GNOME Shell.
 */

import type { ActivationId, DeviceId, LicenseKey } from '../../domain/licensing/index.js';

export const ACTIVATE_PATH = '/v1/license/activate';
export const VALIDATE_PATH = '/v1/license/validate';

export interface ActivationRequest {
  license_key: string;
  device_id: string;
  device_label: string;
}

export interface ValidationRequest {
  license_key: string;
  activation_id: string;
}

export function buildActivationRequest(
  licenseKey: LicenseKey,
  deviceId: DeviceId,
  deviceLabel: string
): ActivationRequest {
  return {
    license_key: licenseKey.toString(),
    device_id: deviceId.toString(),
    device_label: deviceLabel,
  };
}

export function buildValidationRequest(
  licenseKey: LicenseKey,
  activationId: ActivationId
): ValidationRequest {
  return {
    license_key: licenseKey.toString(),
    activation_id: activationId.toString(),
  };
}

/**
 * Body of the request that asks the license server whether it is there.
 * The empty strings cannot go through LicenseKey or ActivationId, which
 * reject them, so the body is built from plain strings.
 */
export function buildProbeRequest(): ValidationRequest {
  return { license_key: '', activation_id: '' };
}
