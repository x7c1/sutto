/**
 * Classification of license server HTTP responses.
 *
 * Kept free of GJS imports so it can be unit tested without GNOME Shell.
 * HTTP status codes and JSON bodies stay inside this layer; callers only see
 * a LicenseServerOutcome.
 */

import {
  ActivationId,
  type ActivationSuccessData,
  isLicenseRejectionReason,
  LicenseServerOutcome,
} from '../../domain/licensing/index.js';
import type { ValidationSuccess } from '../../operations/licensing/index.js';

/**
 * Parses the JSON body of a 2xx response into the expected shape.
 * Returns null when the body does not have that shape.
 */
export type SuccessBodyParser<T> = (body: unknown) => T | null;

/**
 * Classify one HTTP response from the license server.
 *
 * - success: 2xx whose body parses into the expected shape
 * - rejected: 4xx (other than 404 and 410) whose JSON body has a known
 *   reason code in its `type` field
 * - no-response: everything else, such as 404/410 from a retired endpoint,
 *   a 4xx without a known reason code, 5xx, or status 0 (transport failure)
 *
 * @param statusCode HTTP status code, or 0 when no HTTP response was received
 * @param bodyText Response body as text
 * @param parseSuccess Parser for the body of a 2xx response
 */
export function classifyLicenseApiResponse<T>(
  statusCode: number,
  bodyText: string,
  parseSuccess: SuccessBodyParser<T>
): LicenseServerOutcome<T> {
  if (statusCode >= 200 && statusCode < 300) {
    const data = parseSuccess(parseJson(bodyText));
    return data === null ? LicenseServerOutcome.noResponse() : LicenseServerOutcome.succeeded(data);
  }

  // A retired or moved endpoint is not an answer from the license server,
  // whatever its body says.
  if (statusCode === 404 || statusCode === 410) {
    return LicenseServerOutcome.noResponse();
  }

  if (statusCode >= 400 && statusCode < 500) {
    const body = parseJson(bodyText);
    const type = isObject(body) ? body.type : undefined;
    return isLicenseRejectionReason(type)
      ? LicenseServerOutcome.rejected(type)
      : LicenseServerOutcome.noResponse();
  }

  return LicenseServerOutcome.noResponse();
}

/** Parse the body of a successful activation response. */
export function parseActivationSuccess(body: unknown): ActivationSuccessData | null {
  if (!isObject(body)) {
    return null;
  }
  const {
    activation_id: activationId,
    valid_until: validUntil,
    devices_used: devicesUsed,
    devices_limit: devicesLimit,
    deactivated_device: deactivatedDevice,
  } = body;

  if (
    typeof activationId !== 'string' ||
    typeof devicesUsed !== 'number' ||
    typeof devicesLimit !== 'number' ||
    !(
      deactivatedDevice === null ||
      deactivatedDevice === undefined ||
      typeof deactivatedDevice === 'string'
    )
  ) {
    return null;
  }
  const validUntilDate = parseDate(validUntil);
  if (validUntilDate === null) {
    return null;
  }

  let parsedActivationId: ActivationId;
  try {
    parsedActivationId = new ActivationId(activationId);
  } catch {
    return null;
  }

  return {
    activationId: parsedActivationId,
    validUntil: validUntilDate,
    devicesUsed,
    devicesLimit,
    deactivatedDevice: deactivatedDevice ?? null,
  };
}

/** Parse the body of a successful validation response. */
export function parseValidationSuccess(body: unknown): ValidationSuccess | null {
  if (!isObject(body)) {
    return null;
  }
  const { valid_until: validUntil, subscription_status: subscriptionStatus } = body;

  if (typeof subscriptionStatus !== 'string') {
    return null;
  }
  const validUntilDate = parseDate(validUntil);
  if (validUntilDate === null) {
    return null;
  }

  return { validUntil: validUntilDate, subscriptionStatus };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
