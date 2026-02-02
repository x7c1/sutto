import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

const log = (message: string): void => console.log(message);

export interface ActivationRequest {
  license_key: string;
  device_id: string;
  device_label: string;
}

export interface ActivationResponse {
  activation_id: string;
  valid_until: string;
  devices_used: number;
  devices_limit: number;
  deactivated_device: string | null;
}

export interface ValidationRequest {
  license_key: string;
  activation_id: string;
}

export interface ValidationResponse {
  valid_until: string;
  subscription_status: string;
}

export interface LicenseErrorResponse {
  type: LicenseErrorType;
  expired_on?: string;
}

export type LicenseErrorType =
  | 'INVALID_LICENSE_KEY'
  | 'INVALID_ACTIVATION'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_CANCELLED'
  | 'DEVICE_DEACTIVATED';

export class LicenseApiError extends Error {
  constructor(
    public readonly errorType: LicenseErrorType,
    public readonly expiredOn?: string
  ) {
    super(`License API error: ${errorType}`);
    this.name = 'LicenseApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class BackendUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUnreachableError';
  }
}

/**
 * HTTP client for communicating with the snappa backend API
 */
export class LicenseClient {
  private session: Soup.Session;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.session = new Soup.Session();
    this.session.timeout = 30;
  }

  async activate(
    licenseKey: string,
    deviceId: string,
    deviceLabel: string
  ): Promise<ActivationResponse> {
    const url = `${this.baseUrl}/v1/license/activate`;
    const body: ActivationRequest = {
      license_key: licenseKey,
      device_id: deviceId,
      device_label: deviceLabel,
    };

    return this.makeRequest<ActivationResponse>(url, body);
  }

  async validate(licenseKey: string, activationId: string): Promise<ValidationResponse> {
    const url = `${this.baseUrl}/v1/license/validate`;
    const body: ValidationRequest = {
      license_key: licenseKey,
      activation_id: activationId,
    };

    return this.makeRequest<ValidationResponse>(url, body);
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
          const bytes = this.session.send_and_read_finish(result);
          const statusCode = message.get_status();

          if (statusCode === 0) {
            reject(new BackendUnreachableError('Backend server is unreachable'));
            return;
          }

          const responseText = new TextDecoder().decode(bytes.get_data() ?? new Uint8Array());
          log(`[LicenseClient] Response status: ${statusCode}`);

          if (statusCode >= 200 && statusCode < 300) {
            const response = JSON.parse(responseText) as T;
            resolve(response);
          } else if (statusCode >= 400 && statusCode < 500) {
            const errorResponse = JSON.parse(responseText) as LicenseErrorResponse;
            reject(new LicenseApiError(errorResponse.type, errorResponse.expired_on));
          } else {
            reject(new BackendUnreachableError(`Backend returned status ${statusCode}`));
          }
        } catch (e) {
          if (e instanceof LicenseApiError || e instanceof BackendUnreachableError) {
            reject(e);
          } else {
            log(`[LicenseClient] Request failed: ${e}`);
            reject(new BackendUnreachableError(`Request failed: ${e}`));
          }
        }
      });
    });
  }

  /**
   * Check if network is available using NetworkManager via Gio
   */
  static isNetworkAvailable(): boolean {
    try {
      const monitor = Gio.NetworkMonitor.get_default();
      return monitor.get_network_available();
    } catch {
      return true;
    }
  }
}
