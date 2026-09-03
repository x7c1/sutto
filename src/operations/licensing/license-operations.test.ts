// Provide the GNOME Shell global log function for the test environment
globalThis.log = () => {};

import { describe, expect, it } from 'vitest';
import type {
  ActivationResult as ActivationResultType,
  LicenseState,
  LicenseStatus,
  NetworkState,
} from '../../domain/licensing/index.js';
import {
  ActivationId,
  ActivationResult,
  DeviceId,
  License,
  LicenseKey,
  TrialDays,
  TrialPeriod,
} from '../../domain/licensing/index.js';
import type { LicenseApiClient, ValidationResult } from './license-api-client.js';
import type {
  DateProvider,
  DeviceInfoProvider,
  NetworkStateProvider,
} from './license-operations.js';
import { LicenseOperations } from './license-operations.js';
import type { LicenseRepository } from './license-repository.js';

// --- Mock Helpers ---

const TEST_LICENSE_KEY = new LicenseKey('TEST-LICENSE-KEY-123');
const TEST_ACTIVATION_ID = new ActivationId('550e8400-e29b-41d4-a716-446655440000');
const TEST_DEVICE_ID = new DeviceId('test-device-001');
const TEST_DEVICE_LABEL = 'Test Device';
const TEST_VALID_UNTIL = new Date('2026-12-31T00:00:00Z');
const TEST_NOW = new Date('2026-06-15T12:00:00Z');
const TEST_TODAY = '2026-06-15';

function createMockLicense(
  overrides?: Partial<{
    licenseKey: LicenseKey;
    activationId: ActivationId;
    validUntil: Date;
    lastValidated: Date;
    status: LicenseStatus;
  }>
): License {
  return new License({
    licenseKey: overrides?.licenseKey ?? TEST_LICENSE_KEY,
    activationId: overrides?.activationId ?? TEST_ACTIVATION_ID,
    validUntil: overrides?.validUntil ?? TEST_VALID_UNTIL,
    lastValidated: overrides?.lastValidated ?? TEST_NOW,
    status: overrides?.status ?? 'valid',
  });
}

function createMockTrialPeriod(daysUsed = 0, lastUsedDate = ''): TrialPeriod {
  return new TrialPeriod({
    daysUsed: new TrialDays(daysUsed),
    lastUsedDate,
  });
}

function createMockRepository(
  overrides?: Partial<{
    status: LicenseStatus;
    license: License | null;
    trialPeriod: TrialPeriod;
    trialWarningThreshold: number;
  }>
): LicenseRepository {
  let status = overrides?.status ?? 'trial';
  let license = overrides?.license ?? null;
  let trialPeriod = overrides?.trialPeriod ?? TrialPeriod.initial();
  let trialWarningThreshold = overrides?.trialWarningThreshold ?? 0;

  return {
    getStatus: () => status,
    setStatus: (s: LicenseStatus) => {
      status = s;
    },
    loadLicense: () => license,
    saveLicense: (l: License) => {
      license = l;
    },
    loadTrialPeriod: () => trialPeriod,
    saveTrialPeriod: (t: TrialPeriod) => {
      trialPeriod = t;
    },
    getTrialWarningThreshold: () => trialWarningThreshold,
    setTrialWarningThreshold: (threshold: number) => {
      trialWarningThreshold = threshold;
    },
    clearLicense: () => {
      license = null;
      status = 'trial';
    },
  };
}

function createMockApiClient(
  overrides?: Partial<{
    activateResult: ActivationResultType;
    validateResult: ValidationResult;
  }>
): LicenseApiClient {
  return {
    activate: async () =>
      overrides?.activateResult ??
      ActivationResult.succeeded({
        activationId: TEST_ACTIVATION_ID,
        validUntil: TEST_VALID_UNTIL,
        devicesUsed: 1,
        devicesLimit: 3,
        deactivatedDevice: null,
      }),
    validate: async () =>
      overrides?.validateResult ?? {
        success: true as const,
        data: { validUntil: TEST_VALID_UNTIL, subscriptionStatus: 'active' },
      },
  };
}

function createMockDateProvider(now = TEST_NOW, today = TEST_TODAY): DateProvider {
  return {
    now: () => now,
    today: () => today,
  };
}

function createMockNetworkStateProvider(state: NetworkState = 'online'): NetworkStateProvider {
  return {
    getNetworkState: () => state,
  };
}

function createMockDeviceInfoProvider(): DeviceInfoProvider {
  return {
    getDeviceId: () => TEST_DEVICE_ID,
    getDeviceLabel: () => TEST_DEVICE_LABEL,
  };
}

function createOperations(
  overrides?: Partial<{
    repository: LicenseRepository;
    apiClient: LicenseApiClient;
    dateProvider: DateProvider;
    networkStateProvider: NetworkStateProvider;
    deviceInfoProvider: DeviceInfoProvider;
  }>
): LicenseOperations {
  return new LicenseOperations(
    overrides?.repository ?? createMockRepository(),
    overrides?.apiClient ?? createMockApiClient(),
    overrides?.dateProvider ?? createMockDateProvider(),
    overrides?.networkStateProvider ?? createMockNetworkStateProvider(),
    overrides?.deviceInfoProvider ?? createMockDeviceInfoProvider()
  );
}

// --- Tests ---

describe('LicenseOperations', () => {
  describe('initialize', () => {
    it('validates license via API when status is valid with license', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const newValidUntil = new Date('2027-06-30T00:00:00Z');
      const apiClient = createMockApiClient({
        validateResult: {
          success: true,
          data: { validUntil: newValidUntil, subscriptionStatus: 'active' },
        },
      });
      const ops = createOperations({ repository, apiClient });

      await ops.initialize();

      const savedLicense = repository.loadLicense();
      expect(savedLicense).not.toBeNull();
      expect(savedLicense?.validUntil).toEqual(newValidUntil);
    });

    it('records trial usage when status is trial', async () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
      });
      const ops = createOperations({ repository });

      await ops.initialize();

      expect(repository.loadTrialPeriod().daysUsed.toNumber()).toBe(6);
    });

    it('skips trial usage recording when backend is unreachable', async () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
      });
      const networkStateProvider = createMockNetworkStateProvider('backend_unreachable');
      const ops = createOperations({ repository, networkStateProvider });

      await ops.initialize();

      expect(repository.loadTrialPeriod().daysUsed.toNumber()).toBe(5);
    });

    it('notifies state change callbacks after initialization', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      await ops.initialize();

      expect(states.length).toBeGreaterThanOrEqual(1);
      expect(states[states.length - 1].status).toBe('trial');
    });
  });

  describe('getState', () => {
    it('returns correct state combining repository data and network state', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
        trialPeriod: createMockTrialPeriod(5),
      });
      const networkStateProvider = createMockNetworkStateProvider('online');
      const ops = createOperations({ repository, networkStateProvider });

      const state = ops.getState();

      expect(state.status).toBe('valid');
      expect(state.networkState).toBe('online');
      expect(state.trialDaysRemaining).toBe(25);
      expect(state.validUntil).toEqual(TEST_VALID_UNTIL);
    });

    it('returns null validUntil when no license exists', () => {
      const repository = createMockRepository({ status: 'trial' });
      const ops = createOperations({ repository });

      const state = ops.getState();

      expect(state.validUntil).toBeNull();
      expect(state.daysSinceLastValidation).toBe(0);
    });
  });

  describe('getDisabledReason', () => {
    it('returns null when the trial is not expired', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(10),
      });

      expect(createOperations({ repository }).getDisabledReason()).toBeNull();
    });

    it('returns trial-expired when the trial is expired', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(30),
      });

      expect(createOperations({ repository }).getDisabledReason()).toBe('trial-expired');
    });

    it('returns null when valid and online', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const networkStateProvider = createMockNetworkStateProvider('online');

      expect(createOperations({ repository, networkStateProvider }).getDisabledReason()).toBeNull();
    });

    it('returns null when valid and offline within the grace period', () => {
      const recentlyValidated = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense({ lastValidated: recentlyValidated }),
      });
      const networkStateProvider = createMockNetworkStateProvider('offline');

      expect(createOperations({ repository, networkStateProvider }).getDisabledReason()).toBeNull();
    });

    it('returns offline-grace-exceeded when valid and offline beyond the grace period', () => {
      const longAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense({ lastValidated: longAgo }),
      });
      const networkStateProvider = createMockNetworkStateProvider('offline');

      expect(createOperations({ repository, networkStateProvider }).getDisabledReason()).toBe(
        'offline-grace-exceeded'
      );
    });

    it('returns license-expired when status is expired', () => {
      const repository = createMockRepository({ status: 'expired' });

      expect(createOperations({ repository }).getDisabledReason()).toBe('license-expired');
    });

    it('returns license-invalid when status is invalid', () => {
      const repository = createMockRepository({ status: 'invalid' });

      expect(createOperations({ repository }).getDisabledReason()).toBe('license-invalid');
    });
  });

  // Thin wrapper over getDisabledReason(), which owns the per-status cases above.
  describe('shouldExtensionBeEnabled', () => {
    it('returns true when there is no disabled reason', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(10),
      });

      expect(createOperations({ repository }).shouldExtensionBeEnabled()).toBe(true);
    });

    it('returns false when there is a disabled reason', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(30),
      });

      expect(createOperations({ repository }).shouldExtensionBeEnabled()).toBe(false);
    });
  });

  describe('activate', () => {
    it('saves license, sets status to valid, and returns deactivatedDevice on success', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const apiClient = createMockApiClient({
        activateResult: ActivationResult.succeeded({
          activationId: TEST_ACTIVATION_ID,
          validUntil: TEST_VALID_UNTIL,
          devicesUsed: 2,
          devicesLimit: 3,
          deactivatedDevice: 'Old Device',
        }),
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result.success).toBe(true);
      expect(result.deactivatedDevice).toBe('Old Device');
      expect(repository.getStatus()).toBe('valid');
      expect(repository.loadLicense()?.licenseKey).toBe(TEST_LICENSE_KEY);
    });

    it('notifies state change on successful activation', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      await ops.activate(TEST_LICENSE_KEY);

      expect(states.length).toBe(1);
      expect(states[0].status).toBe('valid');
    });

    it('returns retryable error on network error without changing status', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const apiClient = createMockApiClient({
        activateResult: ActivationResult.failed('NETWORK_ERROR'),
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result.success).toBe(false);
      expect(result.isRetryable).toBe(true);
      expect(repository.getStatus()).toBe('trial');
    });

    it('returns retryable error when backend is unreachable without changing status', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const apiClient = createMockApiClient({
        activateResult: ActivationResult.failed('BACKEND_UNREACHABLE'),
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result.success).toBe(false);
      expect(result.isRetryable).toBe(true);
      expect(repository.getStatus()).toBe('trial');
    });

    it('sets status to invalid on invalid key', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const apiClient = createMockApiClient({
        activateResult: ActivationResult.failed('INVALID_LICENSE_KEY'),
      });
      const ops = createOperations({ repository, apiClient });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result.success).toBe(false);
      expect(result.error).toBe('License key not found');
      expect(repository.getStatus()).toBe('invalid');
      expect(states.length).toBe(1);
    });

    it('sets status to invalid on expired license', async () => {
      const repository = createMockRepository({ status: 'trial' });
      const apiClient = createMockApiClient({
        activateResult: ActivationResult.failed('LICENSE_EXPIRED'),
      });
      const ops = createOperations({ repository, apiClient });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Subscription has expired');
      expect(repository.getStatus()).toBe('invalid');
      expect(states.length).toBe(1);
    });
  });

  describe('validateLicense', () => {
    it('returns false when no license exists', async () => {
      const repository = createMockRepository({ status: 'valid', license: null });
      const ops = createOperations({ repository });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
    });

    it('updates license with new validUntil and lastValidated on success', async () => {
      const newValidUntil = new Date('2027-12-31T00:00:00Z');
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: {
          success: true,
          data: { validUntil: newValidUntil, subscriptionStatus: 'active' },
        },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(true);
      const saved = repository.loadLicense();
      expect(saved).not.toBeNull();
      expect(saved?.validUntil).toEqual(newValidUntil);
      expect(saved?.lastValidated).toEqual(TEST_NOW);
    });

    it('sets status to expired when license is expired', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'LICENSE_EXPIRED' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('expired');
    });

    it('sets status to expired when license is cancelled', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'LICENSE_CANCELLED' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('expired');
    });

    it('sets status to expired when device is deactivated', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'DEVICE_DEACTIVATED' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('expired');
    });

    it('keeps cached status and returns true on network error when status is valid', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'NETWORK_ERROR' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(true);
      expect(repository.getStatus()).toBe('valid');
    });

    it('keeps cached status and returns false on network error when status is not valid', async () => {
      const repository = createMockRepository({
        status: 'expired',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'BACKEND_UNREACHABLE' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('expired');
    });

    it('sets status to invalid on invalid license key', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({
        validateResult: { success: false, error: 'INVALID_LICENSE_KEY' },
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('invalid');
    });
  });

  describe('clearLicense', () => {
    it('delegates to repository.clearLicense()', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const ops = createOperations({ repository });

      ops.clearLicense();

      expect(repository.loadLicense()).toBeNull();
      expect(repository.getStatus()).toBe('trial');
    });

    it('notifies state change callbacks', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      ops.clearLicense();

      expect(states.length).toBe(1);
      expect(states[0].status).toBe('trial');
    });
  });

  describe('recordTrialUsage', () => {
    it('records usage when not yet recorded today and returns true', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
      });
      const ops = createOperations({ repository });

      const result = ops.recordTrialUsage();

      expect(result).toBe(true);
      expect(repository.loadTrialPeriod().daysUsed.toNumber()).toBe(6);
      expect(repository.loadTrialPeriod().lastUsedDate).toBe(TEST_TODAY);
    });

    it('skips when already recorded today and returns false', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, TEST_TODAY),
      });
      const ops = createOperations({ repository });

      const result = ops.recordTrialUsage();

      expect(result).toBe(false);
      expect(repository.loadTrialPeriod().daysUsed.toNumber()).toBe(5);
    });

    it('sets status to expired when trial period ends', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(29, '2026-06-14'),
      });
      const ops = createOperations({ repository });

      ops.recordTrialUsage();

      expect(repository.getStatus()).toBe('expired');
    });

    it('notifies state change after recording', () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
      });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      ops.recordTrialUsage();

      expect(states.length).toBe(1);
    });
  });

  describe('state change callbacks', () => {
    it('onStateChange registers callback that receives state updates', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      ops.clearLicense();

      expect(states.length).toBe(1);
      expect(states[0].status).toBe('trial');
    });

    it('clearCallbacks removes all registered callbacks', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const ops = createOperations({ repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      ops.clearCallbacks();
      ops.clearLicense();

      expect(states.length).toBe(0);
    });

    it('callback errors are caught and do not propagate', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const ops = createOperations({ repository });
      ops.onStateChange(() => {
        throw new Error('callback error');
      });
      const secondStates: LicenseState[] = [];
      ops.onStateChange((s) => secondStates.push(s));

      ops.clearLicense();

      expect(secondStates.length).toBe(1);
    });
  });
});
