import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

import {
  ActivationId,
  ActivationResult,
  type DeviceId,
  type LicenseKey,
} from '../../domain/licensing/index.js';
import { type LicenseApiClient, ValidationResult } from '../../operations/licensing/index.js';

const log = (message: string): void => console.log(message);

interface ActivationRequest {
  license_key: string;
  device_id: string;
  device_label: string;
}

interface ActivationResponseData {
  activation_id: string;
  valid_until: string;
  devices_used: number;
  devices_limit: number;
  deactivated_device: string | null;
}

interface ValidationRequest {
  license_key: string;
  activation_id: string;
}

interface ValidationResponseData {
  valid_until: string;
  subscription_status: string;
}

interface ErrorResponseData {
  type: string;
  expired_on?: string;
}

/**
 * HTTP implementation of LicenseApiClient
 * Converts HTTP responses to domain objects
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
    const url = `${this.baseUrl}/v1/license/activate`;
    const body: ActivationRequest = {
      license_key: licenseKey.toString(),
      device_id: deviceId.toString(),
      device_label: deviceLabel,
    };

    try {
      const response = await this.makeRequest<ActivationResponseData>(url, body);
      const activationId = new ActivationId(response.activation_id);

      return ActivationResult.succeeded({
        activationId,
        validUntil: new Date(response.valid_until),
        devicesUsed: response.devices_used,
        devicesLimit: response.devices_limit,
        deactivatedDevice: response.deactivated_device,
      });
    } catch (e) {
      return this.handleActivationError(e);
    }
  }

  async validate(licenseKey: LicenseKey, activationId: ActivationId): Promise<ValidationResult> {
    const url = `${this.baseUrl}/v1/license/validate`;
    const body: ValidationRequest = {
      license_key: licenseKey.toString(),
      activation_id: activationId.toString(),
    };

    try {
      const response = await this.makeRequest<ValidationResponseData>(url, body);
      return ValidationResult.succeeded({
        validUntil: new Date(response.valid_until),
        subscriptionStatus: response.subscription_status,
      });
    } catch (e) {
      return this.handleValidationError(e);
    }
  }

  private async makeRequest<T>(url: string, body: object): Promise<T> {
    return new Promise((resolve, reject) => {
      const message = Soup.Message.new('POST', url);
      if (!message) {
        reject(new NetworkError(`Failed to create request for ${url}`));
        return;
      }

      const jsonBody = JSON.stringify(body);
      const bytes = new GLib.Bytes(new TextEncoder().encode(jsonBody));
      message.set_request_body_from_bytes('application/json', bytes);

      this.session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (_session, result) => {
        try {
          const responseBytes = this.session.send_and_read_finish(result);
          const statusCode = message.get_status();

          if (statusCode === 0) {
            reject(new BackendUnreachableError('Backend server is unreachable'));
            return;
          }

          const responseText = new TextDecoder().decode(
            responseBytes.get_data() ?? new Uint8Array()
          );
          log(`[HttpLicenseApiClient] Response status: ${statusCode}`);

          if (statusCode >= 200 && statusCode < 300) {
            const parsed = this.parseJsonResponse<T>(responseText);
            resolve(parsed);
          } else if (statusCode >= 400 && statusCode < 500) {
            const errorResponse = this.parseJsonResponse<ErrorResponseData>(responseText);
            reject(new LicenseApiError(errorResponse.type, errorResponse.expired_on));
          } else {
            reject(new BackendUnreachableError(`Backend returned status ${statusCode}`));
          }
        } catch (e) {
          if (
            e instanceof LicenseApiError ||
            e instanceof BackendUnreachableError ||
            e instanceof NetworkError
          ) {
            reject(e);
          } else {
            log(`[HttpLicenseApiClient] Request failed: ${e}`);
            reject(new BackendUnreachableError(`Request failed: ${e}`));
          }
        }
      });
    });
  }

  private parseJsonResponse<T>(text: string): T {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid JSON response: expected object');
    }
    return parsed as T;
  }

  private handleActivationError(e: unknown): ActivationResult {
    if (e instanceof LicenseApiError) {
      const errorMap: Record<
        string,
        'INVALID_LICENSE_KEY' | 'LICENSE_EXPIRED' | 'LICENSE_CANCELLED'
      > = {
        INVALID_LICENSE_KEY: 'INVALID_LICENSE_KEY',
        LICENSE_EXPIRED: 'LICENSE_EXPIRED',
        LICENSE_CANCELLED: 'LICENSE_CANCELLED',
      };
      const error = errorMap[e.errorType] ?? 'UNKNOWN_ERROR';
      return ActivationResult.failed(error, e.message);
    }

    if (e instanceof NetworkError) {
      return ActivationResult.failed('NETWORK_ERROR', e.message);
    }

    if (e instanceof BackendUnreachableError) {
      return ActivationResult.failed('BACKEND_UNREACHABLE', e.message);
    }

    log(`[HttpLicenseApiClient] Unknown activation error: ${e}`);
    return ActivationResult.failed('UNKNOWN_ERROR', String(e));
  }

  private handleValidationError(e: unknown): ValidationResult {
    if (e instanceof LicenseApiError) {
      const errorMap: Record<
        string,
        | 'INVALID_LICENSE_KEY'
        | 'INVALID_ACTIVATION'
        | 'LICENSE_EXPIRED'
        | 'LICENSE_CANCELLED'
        | 'DEVICE_DEACTIVATED'
      > = {
        INVALID_LICENSE_KEY: 'INVALID_LICENSE_KEY',
        INVALID_ACTIVATION: 'INVALID_ACTIVATION',
        LICENSE_EXPIRED: 'LICENSE_EXPIRED',
        LICENSE_CANCELLED: 'LICENSE_CANCELLED',
        DEVICE_DEACTIVATED: 'DEVICE_DEACTIVATED',
      };
      return ValidationResult.failed(errorMap[e.errorType] ?? 'BACKEND_UNREACHABLE');
    }

    if (e instanceof NetworkError) {
      return ValidationResult.failed('NETWORK_ERROR');
    }

    if (e instanceof BackendUnreachableError) {
      return ValidationResult.failed('BACKEND_UNREACHABLE');
    }

    log(`[HttpLicenseApiClient] Unknown validation error: ${e}`);
    return ValidationResult.failed('BACKEND_UNREACHABLE');
  }

  static isNetworkAvailable(): boolean {
    try {
      const monitor = Gio.NetworkMonitor.get_default();
      return monitor.get_network_available();
    } catch {
      return true;
    }
  }
}

class LicenseApiError extends Error {
  constructor(
    public readonly errorType: string,
    public readonly expiredOn?: string
  ) {
    super(`License API error: ${errorType}`);
    this.name = 'LicenseApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

class BackendUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUnreachableError';
  }
}
