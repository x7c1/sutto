import type { ActivationId } from './activation-id.js';

export type ActivationError =
  | 'INVALID_LICENSE_KEY'
  | 'LICENSE_EXPIRED'
  | 'LICENSE_CANCELLED'
  | 'NETWORK_ERROR'
  | 'BACKEND_UNREACHABLE'
  | 'UNKNOWN_ERROR';

export interface ActivationSuccessData {
  activationId: ActivationId;
  validUntil: Date;
  devicesUsed: number;
  devicesLimit: number;
  deactivatedDevice: string | null;
}

/**
 * Result of a license activation attempt
 */
export class ActivationResult {
  private constructor(
    private readonly success: boolean,
    private readonly data?: ActivationSuccessData,
    private readonly error?: ActivationError,
    private readonly errorMessage?: string
  ) {}

  static succeeded(data: ActivationSuccessData): ActivationResult {
    return new ActivationResult(true, data);
  }

  static failed(error: ActivationError, message?: string): ActivationResult {
    return new ActivationResult(false, undefined, error, message);
  }

  isSuccess(): boolean {
    return this.success;
  }

  getData(): ActivationSuccessData | undefined {
    return this.data;
  }

  getError(): ActivationError | undefined {
    return this.error;
  }

  getErrorMessage(): string | undefined {
    return this.errorMessage;
  }
}
