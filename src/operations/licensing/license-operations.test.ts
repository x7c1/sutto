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
  getLicenseStatusDisplay,
  License,
  LicenseKey,
  TrialDays,
  TrialPeriod,
} from '../../domain/licensing/index.js';
import { type LicenseApiClient, ValidationResult } from './license-api-client.js';
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
    lastOnlineAt: Date | null;
  }>
): LicenseRepository {
  let status = overrides?.status ?? 'trial';
  let license = overrides?.license ?? null;
  let trialPeriod = overrides?.trialPeriod ?? TrialPeriod.initial();
  let trialWarningThreshold = overrides?.trialWarningThreshold ?? 0;
  let lastOnlineAt = overrides?.lastOnlineAt ?? null;

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
    getLastOnlineAt: () => lastOnlineAt,
    setLastOnlineAt: (date: Date) => {
      lastOnlineAt = date;
    },
    clearLicense: () => {
      license = null;
      status = 'trial';
    },
    watchChanges: () => () => {},
  };
}

interface ExternalStore {
  status: LicenseStatus;
  license: License | null;
  trialPeriod: TrialPeriod;
  lastOnlineAt?: Date | null;
}

/**
 * A repository whose stored data can be changed from outside (as another
 * process would), with a way to fire the change callbacks and a count of the
 * writes made through the repository itself.
 */
function createExternallyChangedRepository(initial: ExternalStore): {
  repository: LicenseRepository;
  store: ExternalStore;
  fireChange: () => void;
  watcherCount: () => number;
  writeCount: () => number;
} {
  const store = { ...initial };
  const watchers = new Set<() => void>();
  let writes = 0;
  const write = <T extends unknown[]>(apply: (...args: T) => void) => {
    return (...args: T) => {
      writes++;
      apply(...args);
    };
  };

  const repository: LicenseRepository = {
    getStatus: () => store.status,
    setStatus: write((s: LicenseStatus) => {
      store.status = s;
    }),
    loadLicense: () => store.license,
    saveLicense: write((l: License) => {
      store.license = l;
    }),
    loadTrialPeriod: () => store.trialPeriod,
    saveTrialPeriod: write((t: TrialPeriod) => {
      store.trialPeriod = t;
    }),
    getTrialWarningThreshold: () => 0,
    setTrialWarningThreshold: write(() => {}),
    // Not license or trial data: not counted as a write.
    getLastOnlineAt: () => store.lastOnlineAt ?? null,
    setLastOnlineAt: (date: Date) => {
      store.lastOnlineAt = date;
    },
    clearLicense: write(() => {
      store.license = null;
      store.status = 'trial';
    }),
    watchChanges: (callback: () => void) => {
      watchers.add(callback);
      return () => watchers.delete(callback);
    },
  };

  return {
    repository,
    store,
    fireChange: () => {
      for (const watcher of watchers) {
        watcher();
      }
    },
    watcherCount: () => watchers.size,
    writeCount: () => writes,
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
      overrides?.validateResult ??
      ValidationResult.succeeded({ validUntil: TEST_VALID_UNTIL, subscriptionStatus: 'active' }),
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
    watchNetworkState: () => () => {},
  };
}

/**
 * A network state provider whose state can be changed, reporting each change
 * to the watchers as Gio.NetworkMonitor would.
 */
function createChangingNetworkStateProvider(initial: NetworkState): {
  provider: NetworkStateProvider;
  change: (state: NetworkState) => void;
  watcherCount: () => number;
} {
  let state = initial;
  const watchers = new Set<(state: NetworkState) => void>();
  return {
    provider: {
      getNetworkState: () => state,
      watchNetworkState: (callback) => {
        watchers.add(callback);
        return () => watchers.delete(callback);
      },
    },
    change: (next) => {
      state = next;
      for (const watcher of watchers) {
        watcher(next);
      }
    },
    watcherCount: () => watchers.size,
  };
}

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
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
        validateResult: ValidationResult.succeeded({
          validUntil: newValidUntil,
          subscriptionStatus: 'active',
        }),
      });
      const ops = createOperations({ repository, apiClient });

      await ops.initialize();

      const savedLicense = repository.loadLicense();
      expect(savedLicense).not.toBeNull();
      expect(savedLicense?.validUntil).toEqual(newValidUntil);
    });

    it('records last online and validates when online', async () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
        lastOnlineAt: daysBefore(TEST_NOW, 3),
      });
      let validateCalls = 0;
      const apiClient = createMockApiClient();
      const validate = apiClient.validate;
      apiClient.validate = (...args) => {
        validateCalls++;
        return validate(...args);
      };
      const ops = createOperations({
        repository,
        apiClient,
        networkStateProvider: createMockNetworkStateProvider('online'),
      });

      await ops.initialize();

      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
      expect(validateCalls).toBe(1);
    });

    it('neither records last online nor validates when offline', async () => {
      const lastOnlineAt = daysBefore(TEST_NOW, 3);
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
        lastOnlineAt,
      });
      const apiClient = createMockApiClient();
      apiClient.validate = () => {
        throw new Error('validate is not expected to be called while offline');
      };
      const ops = createOperations({
        repository,
        apiClient,
        networkStateProvider: createMockNetworkStateProvider('offline'),
      });

      await ops.initialize();

      expect(repository.getLastOnlineAt()).toEqual(lastOnlineAt);
      expect(ops.getDisabledReason()).toBeNull();
    });

    it('does not record a trial day', async () => {
      const repository = createMockRepository({
        status: 'trial',
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
      });
      const ops = createOperations({ repository });

      await ops.initialize();

      expect(repository.loadTrialPeriod().daysUsed.toNumber()).toBe(5);
      expect(repository.loadTrialPeriod().lastUsedDate).toBe('2026-06-14');
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

  describe('recordOnlineIfConnected', () => {
    it('records now as last online when online', () => {
      const repository = createMockRepository({ lastOnlineAt: daysBefore(TEST_NOW, 3) });
      const ops = createOperations({
        repository,
        networkStateProvider: createMockNetworkStateProvider('online'),
      });

      expect(ops.recordOnlineIfConnected()).toBe(true);
      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
    });

    it('leaves last online unchanged when offline', () => {
      const lastOnlineAt = daysBefore(TEST_NOW, 3);
      const repository = createMockRepository({ lastOnlineAt });
      const ops = createOperations({
        repository,
        networkStateProvider: createMockNetworkStateProvider('offline'),
      });

      expect(ops.recordOnlineIfConnected()).toBe(false);
      expect(repository.getLastOnlineAt()).toEqual(lastOnlineAt);
    });

    it('does not notify state change callbacks', () => {
      const ops = createOperations({
        repository: createMockRepository({ lastOnlineAt: daysBefore(TEST_NOW, 3) }),
        networkStateProvider: createMockNetworkStateProvider('online'),
      });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      ops.recordOnlineIfConnected();

      expect(states).toEqual([]);
    });
  });

  describe('watchNetworkState', () => {
    it('records last online when the network comes back, without notifying', () => {
      const lastOnlineAt = daysBefore(TEST_NOW, 3);
      const repository = createMockRepository({ lastOnlineAt });
      const network = createChangingNetworkStateProvider('offline');
      const ops = createOperations({ repository, networkStateProvider: network.provider });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));
      ops.watchNetworkState();

      network.change('offline');
      expect(repository.getLastOnlineAt()).toEqual(lastOnlineAt);

      network.change('online');
      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
      expect(states).toEqual([]);
    });

    it('records last online when the network goes away after being online', () => {
      const repository = createMockRepository({ lastOnlineAt: daysBefore(TEST_NOW, 3) });
      const network = createChangingNetworkStateProvider('online');
      const ops = createOperations({ repository, networkStateProvider: network.provider });
      ops.watchNetworkState();

      network.change('offline');
      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
    });

    it('leaves last online unchanged while the network stays offline', () => {
      const lastOnlineAt = daysBefore(TEST_NOW, 3);
      const repository = createMockRepository({ lastOnlineAt });
      const network = createChangingNetworkStateProvider('offline');
      const ops = createOperations({ repository, networkStateProvider: network.provider });
      ops.watchNetworkState();

      network.change('offline');
      network.change('offline');
      expect(repository.getLastOnlineAt()).toEqual(lastOnlineAt);
    });

    it('calls back after recording whenever the network is online', () => {
      const repository = createMockRepository({ lastOnlineAt: daysBefore(TEST_NOW, 3) });
      const network = createChangingNetworkStateProvider('offline');
      const ops = createOperations({ repository, networkStateProvider: network.provider });
      const recordedOnCall: (Date | null)[] = [];
      ops.watchNetworkState(() => recordedOnCall.push(repository.getLastOnlineAt()));

      network.change('offline');
      expect(recordedOnCall).toEqual([]);

      network.change('online');
      expect(recordedOnCall).toEqual([TEST_NOW]);
    });

    it('stops watching when the returned function is called', () => {
      const network = createChangingNetworkStateProvider('offline');
      const ops = createOperations({ networkStateProvider: network.provider });

      const stop = ops.watchNetworkState();
      expect(network.watcherCount()).toBe(1);

      stop();
      expect(network.watcherCount()).toBe(0);
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
    });

    it('reports the days since the device was last online', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense({ lastValidated: daysBefore(TEST_NOW, 30) }),
        lastOnlineAt: daysBefore(TEST_NOW, 2.5),
      });
      const ops = createOperations({ repository });

      expect(ops.getState().daysSinceLastOnline).toBe(2.5);
    });

    it('counts the offline subtitle from last online, not from the last validation', () => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense({ lastValidated: daysBefore(TEST_NOW, 30) }),
        lastOnlineAt: daysBefore(TEST_NOW, 2.5),
      });
      const ops = createOperations({
        repository,
        networkStateProvider: createMockNetworkStateProvider('offline'),
      });

      expect(getLicenseStatusDisplay(ops.getState()).subtitle).toBe(
        'Offline - connect within 5 days'
      );
    });

    it('counts a missing last-online time as now and stores it', () => {
      const repository = createMockRepository({ status: 'trial', lastOnlineAt: null });
      const ops = createOperations({
        repository,
        networkStateProvider: createMockNetworkStateProvider('offline'),
      });

      expect(ops.getState().daysSinceLastOnline).toBe(0);
      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
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

    function validLicenseOperations(options: {
      network: NetworkState;
      lastOnlineAt: Date | null;
      lastValidated?: Date;
    }): { ops: LicenseOperations; repository: LicenseRepository } {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense({ lastValidated: options.lastValidated ?? TEST_NOW }),
        lastOnlineAt: options.lastOnlineAt,
      });
      const networkStateProvider = createMockNetworkStateProvider(options.network);
      return { ops: createOperations({ repository, networkStateProvider }), repository };
    }

    it('returns null when valid and online, however long ago it was last online', () => {
      const { ops } = validLicenseOperations({
        network: 'online',
        lastOnlineAt: daysBefore(TEST_NOW, 30),
      });

      expect(ops.getDisabledReason()).toBeNull();
    });

    it('returns null when valid and offline 6 days after last online', () => {
      const { ops } = validLicenseOperations({
        network: 'offline',
        lastOnlineAt: daysBefore(TEST_NOW, 6),
      });

      expect(ops.getDisabledReason()).toBeNull();
    });

    it('returns offline-grace-exceeded when valid and offline 7 days after last online', () => {
      const { ops } = validLicenseOperations({
        network: 'offline',
        lastOnlineAt: daysBefore(TEST_NOW, 7),
      });

      expect(ops.getDisabledReason()).toBe('offline-grace-exceeded');
    });

    it('counts the grace period from last online, not from the last validation', () => {
      const { ops } = validLicenseOperations({
        network: 'offline',
        lastOnlineAt: daysBefore(TEST_NOW, 1),
        lastValidated: daysBefore(TEST_NOW, 30),
      });

      expect(ops.getDisabledReason()).toBeNull();
    });

    it('treats a missing last-online time as now while offline and stores now', () => {
      const { ops, repository } = validLicenseOperations({
        network: 'offline',
        lastOnlineAt: null,
        lastValidated: daysBefore(TEST_NOW, 30),
      });

      expect(ops.getDisabledReason()).toBeNull();
      expect(repository.getLastOnlineAt()).toEqual(TEST_NOW);
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

    it('returns a retryable failure and writes nothing when the server does not respond', async () => {
      const fake = createExternallyChangedRepository({
        status: 'trial',
        license: null,
        trialPeriod: createMockTrialPeriod(5),
      });
      const apiClient = createMockApiClient({ activateResult: ActivationResult.noResponse() });
      const ops = createOperations({ repository: fake.repository, apiClient });

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result).toEqual({
        success: false,
        error: "Couldn't reach the license server. Try again later.",
        isRetryable: true,
      });
      expect(fake.writeCount()).toBe(0);
      expect(fake.store.status).toBe('trial');
      expect(fake.store.license).toBeNull();
    });

    it.each([
      ['INVALID_LICENSE_KEY', 'License key not found'],
      ['INVALID_ACTIVATION', 'Activation is no longer valid'],
      ['LICENSE_EXPIRED', 'Subscription has expired'],
      ['LICENSE_CANCELLED', 'Subscription was cancelled'],
      ['DEVICE_DEACTIVATED', 'This device was deactivated'],
    ] as const)('keeps a trial and saves no license when rejected with %s', async (reason, message) => {
      const fake = createExternallyChangedRepository({
        status: 'trial',
        license: null,
        trialPeriod: createMockTrialPeriod(5),
      });
      const apiClient = createMockApiClient({ activateResult: ActivationResult.rejected(reason) });
      const ops = createOperations({ repository: fake.repository, apiClient });

      const result = await ops.activate(TEST_LICENSE_KEY);

      expect(result).toEqual({ success: false, error: message });
      expect(result.isRetryable).toBeUndefined();
      expect(fake.writeCount()).toBe(0);
      expect(fake.store.status).toBe('trial');
      expect(fake.store.license).toBeNull();
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
        validateResult: ValidationResult.succeeded({
          validUntil: newValidUntil,
          subscriptionStatus: 'active',
        }),
      });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(true);
      const saved = repository.loadLicense();
      expect(saved).not.toBeNull();
      expect(saved?.validUntil).toEqual(newValidUntil);
      expect(saved?.lastValidated).toEqual(TEST_NOW);
    });

    it.each([
      ['LICENSE_EXPIRED', 'expired'],
      ['LICENSE_CANCELLED', 'expired'],
      ['DEVICE_DEACTIVATED', 'expired'],
      ['INVALID_LICENSE_KEY', 'invalid'],
      ['INVALID_ACTIVATION', 'invalid'],
    ] as const)('a rejection with %s sets status to %s', async (reason, expectedStatus) => {
      const repository = createMockRepository({
        status: 'valid',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({ validateResult: ValidationResult.rejected(reason) });
      const ops = createOperations({ repository, apiClient });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe(expectedStatus);
      expect(states.length).toBe(1);
    });

    it('leaves the stored status and license untouched and keeps a valid license enabled when the server does not respond', async () => {
      const license = createMockLicense();
      const fake = createExternallyChangedRepository({
        status: 'valid',
        license,
        trialPeriod: createMockTrialPeriod(30),
      });
      const apiClient = createMockApiClient({ validateResult: ValidationResult.noResponse() });
      const ops = createOperations({ repository: fake.repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(true);
      expect(fake.writeCount()).toBe(0);
      expect(fake.store.status).toBe('valid');
      expect(fake.store.license).toBe(license);
      expect(ops.shouldExtensionBeEnabled()).toBe(true);
    });

    it('keeps the stored status and returns false when the server does not respond and status is not valid', async () => {
      const repository = createMockRepository({
        status: 'expired',
        license: createMockLicense(),
      });
      const apiClient = createMockApiClient({ validateResult: ValidationResult.noResponse() });
      const ops = createOperations({ repository, apiClient });

      const result = await ops.validateLicense();

      expect(result).toBe(false);
      expect(repository.getStatus()).toBe('expired');
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

    it.each([
      'valid',
      'expired',
      'invalid',
    ] as const)('records nothing and returns false when status is %s', (status) => {
      const repository = createMockRepository({
        status,
        trialPeriod: createMockTrialPeriod(5, '2026-06-14'),
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

  describe('watchStoredChanges', () => {
    it('reflects a license activated by another process once the change is reported', () => {
      const fake = createExternallyChangedRepository({
        status: 'trial',
        license: null,
        trialPeriod: createMockTrialPeriod(30),
      });
      const ops = createOperations({ repository: fake.repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));
      ops.watchStoredChanges();
      expect(ops.getDisabledReason()).toBe('trial-expired');

      fake.store.license = createMockLicense();
      fake.store.status = 'valid';
      fake.fireChange();

      expect(ops.getDisabledReason()).toBeNull();
      expect(states.length).toBe(1);
      expect(states[0].status).toBe('valid');
    });

    it('reflects a license that became invalid in another process', () => {
      const fake = createExternallyChangedRepository({
        status: 'valid',
        license: createMockLicense(),
        trialPeriod: createMockTrialPeriod(30),
      });
      const ops = createOperations({ repository: fake.repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));
      ops.watchStoredChanges();
      expect(ops.getDisabledReason()).toBeNull();

      fake.store.status = 'expired';
      fake.fireChange();

      expect(ops.getDisabledReason()).toBe('license-expired');
      expect(states.length).toBe(1);
      expect(states[0].status).toBe('expired');
    });

    it('does not write to the repository when handling a change', () => {
      const fake = createExternallyChangedRepository({
        status: 'trial',
        license: null,
        trialPeriod: createMockTrialPeriod(5, TEST_TODAY),
      });
      const ops = createOperations({ repository: fake.repository });
      ops.onStateChange(() => {});
      ops.watchStoredChanges();

      fake.fireChange();
      fake.store.status = 'expired';
      fake.fireChange();

      expect(fake.writeCount()).toBe(0);
    });

    it('stops notifying once the returned function is called', () => {
      const fake = createExternallyChangedRepository({
        status: 'trial',
        license: null,
        trialPeriod: createMockTrialPeriod(5),
      });
      const ops = createOperations({ repository: fake.repository });
      const states: LicenseState[] = [];
      ops.onStateChange((s) => states.push(s));
      const stop = ops.watchStoredChanges();

      stop();
      fake.fireChange();

      expect(fake.watcherCount()).toBe(0);
      expect(states.length).toBe(0);
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
