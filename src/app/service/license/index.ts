export type {
  ActivationRequest,
  ActivationResponse,
  LicenseErrorResponse,
  LicenseErrorType,
  ValidationRequest,
  ValidationResponse,
} from './license-client.js';
export {
  BackendUnreachableError,
  LicenseApiError,
  LicenseClient,
  NetworkError,
} from './license-client.js';
export type { ActivationResult, LicenseState, NetworkState } from './license-manager.js';
export { LicenseManager } from './license-manager.js';
export type { LicenseData, LicenseStatus } from './license-storage.js';
export { LicenseStorage } from './license-storage.js';
export { TrialManager } from './trial-manager.js';
