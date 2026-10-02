import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {
  type ActivationId,
  type ActivationResult,
  type DeviceId,
  type LicenseKey,
  LicenseServerOutcome,
} from '../../domain/licensing/index.js';
import type { LicenseApiClient, ValidationResult } from '../../operations/licensing/index.js';
import {
  classifyLicenseApiResponse,
  parseActivationSuccess,
  parseValidationSuccess,
  type SuccessBodyParser,
} from './license-api-response.js';

const log = (message: string): void => console.log(message);

interface ActivationRequest {
  license_key: string;
  device_id: string;
  device_label: string;
}

interface ValidationRequest {
  license_key: string;
  activation_id: string;
}

interface HttpResponse {
  /** HTTP status code, or 0 when no HTTP response was received */
  statusCode: number;
  bodyText: string;
}

/**
 * HTTP implementation of LicenseApiClient.
 * Classifies every HTTP response into a LicenseServerOutcome, so callers never
 * see status codes or response bodies.
 */
export class HttpLicenseApiClient implements LicenseApiClient {
  private session: Soup.Session;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.session = new Soup.Session();
    this.session.timeout = 30;
  }

  async activate(
    licenseKey: LicenseKey,
    deviceId: DeviceId,
    deviceLabel: string
  ): Promise<ActivationResult> {
    const body: ActivationRequest = {
      license_key: licenseKey.toString(),
      device_id: deviceId.toString(),
      device_label: deviceLabel,
    };
    return this.request('/v1/license/activate', body, parseActivationSuccess);
  }

  async validate(licenseKey: LicenseKey, activationId: ActivationId): Promise<ValidationResult> {
    const body: ValidationRequest = {
      license_key: licenseKey.toString(),
      activation_id: activationId.toString(),
    };
    return this.request('/v1/license/validate', body, parseValidationSuccess);
  }

  /**
   * Send a request and classify its response. Never throws: any failure to
   * get a response is classified as no response.
   */
  private async request<T>(
    path: string,
    body: object,
    parseSuccess: SuccessBodyParser<T>
  ): Promise<LicenseServerOutcome<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await this.post(url, body);
      const outcome = classifyLicenseApiResponse(
        response.statusCode,
        response.bodyText,
        parseSuccess
      );
      log(
        `[HttpLicenseApiClient] ${path}: status ${response.statusCode} classified as ${describeOutcome(outcome)}`
      );
      return outcome;
    } catch (e) {
      log(`[HttpLicenseApiClient] ${path}: request failed, classified as no-response: ${e}`);
      return LicenseServerOutcome.noResponse();
    }
  }

  private post(url: string, body: object): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const message = Soup.Message.new('POST', url);
      if (!message) {
        reject(new Error(`Failed to create request for ${url}`));
        return;
      }

      const bytes = new GLib.Bytes(new TextEncoder().encode(JSON.stringify(body)));
      message.set_request_body_from_bytes('application/json', bytes);

      this.session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_session, result) => {
        try {
          const responseBytes = this.session.send_and_read_finish(result);
          const bodyText = new TextDecoder().decode(responseBytes.get_data() ?? new Uint8Array());
          resolve({ statusCode: message.get_status(), bodyText });
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}

function describeOutcome(outcome: LicenseServerOutcome<unknown>): string {
  return outcome.kind === 'rejected' ? `rejected (${outcome.reason})` : outcome.kind;
}
