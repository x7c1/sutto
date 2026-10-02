// Provide the GNOME Shell global log function for the test environment
globalThis.log = () => {};

import { describe, expect, it } from 'vitest';
import type { DisabledReason, LicenseStatus, NetworkState } from '../../domain/licensing/index.js';
import {
  ActivationId,
  DeviceId,
  License,
  LicenseKey,
  TrialDays,
  TrialPeriod,
} from '../../domain/licensing/index.js';
import type { LicenseApiClient, LicenseRepository } from '../../operations/licensing/index.js';
import { LicenseOperations, TrialWarningOperations } from '../../operations/licensing/index.js';
import { LicenseStateHandler } from './license-state-handler.js';

const unexpected = (name: string) => (): never => {
  throw new Error(`${name} is not expected to be called`);
};

/**
 * A repository standing in for storage shared with another process: its data
 * is changed directly (as the other process would), then fireChange() reports it.
 */
function createSharedStorage() {
  const store: { status: LicenseStatus; license: License | null; lastOnlineAt: Date | null } = {
    status: 'expired',
    license: null,
    lastOnlineAt: null,
  };
  const trialPeriod = new TrialPeriod({ daysUsed: new TrialDays(30), lastUsedDate: '2026-06-15' });
  const watchers = new Set<() => void>();

  const repository: LicenseRepository = {
    getStatus: () => store.status,
    setStatus: unexpected('setStatus'),
    loadLicense: () => store.license,
    saveLicense: unexpected('saveLicense'),
    loadTrialPeriod: () => trialPeriod,
    saveTrialPeriod: unexpected('saveTrialPeriod'),
    getTrialWarningThreshold: () => 0,
    setTrialWarningThreshold: unexpected('setTrialWarningThreshold'),
    getLastOnlineAt: () => store.lastOnlineAt,
    setLastOnlineAt: (date) => {
      store.lastOnlineAt = date;
    },
    clearLicense: unexpected('clearLicense'),
    watchChanges: (callback) => {
      watchers.add(callback);
      return () => watchers.delete(callback);
    },
  };

  return {
    repository,
    store,
    fireChange: () => {
      for (const watcher of [...watchers]) {
        watcher();
      }
    },
    watcherCount: () => watchers.size,
  };
}

/**
 * An in-memory repository that records every trial period it is asked to save.
 */
function createTrialStorage(
  status: LicenseStatus,
  trialPeriod: TrialPeriod,
  trialWarningThreshold = 0
) {
  const store: {
    status: LicenseStatus;
    trialPeriod: TrialPeriod;
    trialWarningThreshold: number;
    lastOnlineAt: Date | null;
  } = { status, trialPeriod, trialWarningThreshold, lastOnlineAt: null };
  const savedTrialPeriods: TrialPeriod[] = [];

  const repository: LicenseRepository = {
    getStatus: () => store.status,
    setStatus: (next) => {
      store.status = next;
    },
    // No stored license, so initialize() never calls the license API.
    loadLicense: () => null,
    saveLicense: unexpected('saveLicense'),
    loadTrialPeriod: () => store.trialPeriod,
    saveTrialPeriod: (next) => {
      store.trialPeriod = next;
      savedTrialPeriods.push(next);
    },
    getTrialWarningThreshold: () => store.trialWarningThreshold,
    setTrialWarningThreshold: (threshold) => {
      store.trialWarningThreshold = threshold;
    },
    getLastOnlineAt: () => store.lastOnlineAt,
    setLastOnlineAt: (date) => {
      store.lastOnlineAt = date;
    },
    clearLicense: unexpected('clearLicense'),
    watchChanges: () => () => {},
  };

  return { repository, store, savedTrialPeriods };
}

function trialPeriod(daysUsed: number, lastUsedDate: string): TrialPeriod {
  return new TrialPeriod({ daysUsed: new TrialDays(daysUsed), lastUsedDate });
}

/**
 * A network that is online or offline, counting its watchers. change() sets
 * the state and reports it to the watchers as Gio.NetworkMonitor would.
 */
function createNetwork(initial: NetworkState = 'online') {
  const callbacks = new Set<(state: NetworkState) => void>();
  const network = {
    state: initial,
    get watchers() {
      return callbacks.size;
    },
    change(next: NetworkState) {
      network.state = next;
      for (const callback of [...callbacks]) {
        callback(next);
      }
    },
  };
  const provider = {
    getNetworkState: () => network.state,
    watchNetworkState: (callback: (state: NetworkState) => void) => {
      callbacks.add(callback);
      return () => {
        callbacks.delete(callback);
      };
    },
  };
  return { network, provider };
}

const NOW = new Date('2026-06-15T12:00:00Z');

function createHandler(
  repository: LicenseRepository,
  warnings: string[] = [],
  networkStateProvider = createNetwork().provider
): LicenseStateHandler {
  const apiClient: LicenseApiClient = {
    activate: unexpected('activate'),
    validate: unexpected('validate'),
  };
  const licenseOperations = new LicenseOperations(
    repository,
    apiClient,
    { now: () => NOW, today: () => '2026-06-15' },
    networkStateProvider,
    { getDeviceId: () => new DeviceId('test-device'), getDeviceLabel: () => 'Test Device' }
  );
  const trialWarningOperations = new TrialWarningOperations(repository, {
    notifyError: () => {},
    notifyWarning: (_title, message) => warnings.push(message),
  });
  return new LicenseStateHandler(licenseOperations, trialWarningOperations);
}

function createValidLicense(): License {
  return new License({
    licenseKey: new LicenseKey('TEST-LICENSE-KEY-123'),
    activationId: new ActivationId('550e8400-e29b-41d4-a716-446655440000'),
    validUntil: new Date('2026-12-31T00:00:00Z'),
    lastValidated: new Date(),
    status: 'valid',
  });
}

async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('LicenseStateHandler', () => {
  it('unlocks as soon as a license stored by another process is reported', async () => {
    const storage = createSharedStorage();
    const handler = createHandler(storage.repository);
    handler.initialize(() => {});
    await flushPromises();
    expect(handler.getDisabledReason()).toBe('license-expired');

    storage.store.license = createValidLicense();
    storage.store.status = 'valid';
    storage.fireChange();

    expect(handler.getDisabledReason()).toBeNull();
  });

  it('reports a license that another process marked invalid', async () => {
    const storage = createSharedStorage();
    const handler = createHandler(storage.repository);
    const invalidReasons: DisabledReason[] = [];
    handler.initialize((reason) => invalidReasons.push(reason));
    await flushPromises();
    invalidReasons.length = 0;

    storage.store.license = createValidLicense();
    storage.store.status = 'valid';
    storage.fireChange();
    expect(handler.getDisabledReason()).toBeNull();
    expect(invalidReasons).toEqual([]);

    storage.store.status = 'expired';
    storage.fireChange();

    expect(handler.getDisabledReason()).toBe('license-expired');
    expect(invalidReasons).toEqual(['license-expired']);
  });

  it('notifies additional state listeners of changes stored by another process', async () => {
    const storage = createSharedStorage();
    const handler = createHandler(storage.repository);
    handler.initialize(() => {});
    await flushPromises();
    let notified = 0;
    handler.onStateChange(() => notified++);

    storage.store.license = createValidLicense();
    storage.store.status = 'valid';
    storage.fireChange();

    expect(notified).toBe(1);
  });

  it('stops following stored changes once disposed', async () => {
    const storage = createSharedStorage();
    const handler = createHandler(storage.repository);
    handler.initialize(() => {});
    await flushPromises();

    handler.dispose();
    storage.store.license = createValidLicense();
    storage.store.status = 'valid';
    storage.fireChange();

    expect(storage.watcherCount()).toBe(0);
    expect(handler.getDisabledReason()).toBe('license-expired');
  });

  it('watches stored changes only once when initialized again', async () => {
    const storage = createSharedStorage();
    const handler = createHandler(storage.repository);
    handler.initialize(() => {});
    handler.initialize(() => {});
    await flushPromises();

    expect(storage.watcherCount()).toBe(1);
  });

  it('follows the network state until disposed', async () => {
    const storage = createSharedStorage();
    const { network, provider } = createNetwork();
    const handler = createHandler(storage.repository, [], provider);
    handler.initialize(() => {});
    handler.initialize(() => {});
    await flushPromises();
    expect(network.watchers).toBe(1);

    handler.dispose();

    expect(network.watchers).toBe(0);
  });

  it('unlocks once the network comes back after the offline grace period was exceeded', async () => {
    const storage = createSharedStorage();
    storage.store.license = createValidLicense();
    storage.store.status = 'valid';
    storage.store.lastOnlineAt = new Date('2026-06-01T00:00:00Z');
    const { network, provider } = createNetwork('offline');
    const handler = createHandler(storage.repository, [], provider);
    handler.initialize(() => {});
    await flushPromises();
    expect(handler.getDisabledReason()).toBe('offline-grace-exceeded');

    network.change('online');

    expect(handler.getDisabledReason()).toBeNull();
    expect(storage.store.lastOnlineAt).toEqual(NOW);
  });

  describe('recordPanelUse', () => {
    it('records now as last online when online', async () => {
      const storage = createSharedStorage();
      const handler = createHandler(storage.repository);
      handler.initialize(() => {});
      await flushPromises();
      storage.store.lastOnlineAt = new Date('2026-06-10T00:00:00Z');

      handler.recordPanelUse();

      expect(storage.store.lastOnlineAt).toEqual(NOW);
    });

    it('leaves last online unchanged when offline', async () => {
      const storage = createSharedStorage();
      const handler = createHandler(storage.repository, [], createNetwork('offline').provider);
      handler.initialize(() => {});
      await flushPromises();
      const lastOnlineAt = new Date('2026-06-10T00:00:00Z');
      storage.store.lastOnlineAt = lastOnlineAt;

      handler.recordPanelUse();

      expect(storage.store.lastOnlineAt).toEqual(lastOnlineAt);
    });

    it('records today once per day during the trial', async () => {
      const storage = createTrialStorage('trial', trialPeriod(5, '2026-06-14'));
      const handler = createHandler(storage.repository);
      handler.initialize(() => {});
      await flushPromises();

      handler.recordPanelUse();

      expect(storage.savedTrialPeriods).toHaveLength(1);
      expect(storage.savedTrialPeriods[0].lastUsedDate).toBe('2026-06-15');
      expect(storage.savedTrialPeriods[0].daysUsed.toNumber()).toBe(6);

      handler.recordPanelUse();

      expect(storage.savedTrialPeriods).toHaveLength(1);
    });

    it.each([
      'valid',
      'expired',
      'invalid',
    ] as const)('writes no trial data when the status is %s', async (status) => {
      const storage = createTrialStorage(status, trialPeriod(5, '2026-06-14'));
      storage.repository.saveTrialPeriod = unexpected('saveTrialPeriod');
      const handler = createHandler(storage.repository);
      handler.initialize(() => {});
      await flushPromises();

      handler.recordPanelUse();

      expect(storage.store.trialPeriod.daysUsed.toNumber()).toBe(5);
    });

    it('locks the panel as soon as the day that reaches the limit is recorded', async () => {
      const storage = createTrialStorage('trial', trialPeriod(29, '2026-06-14'));
      const handler = createHandler(storage.repository);
      handler.initialize(() => {});
      await flushPromises();
      expect(handler.getDisabledReason()).toBeNull();

      handler.recordPanelUse();

      expect(handler.getDisabledReason()).toBe('license-expired');
    });

    it('warns when a recorded day crosses a warning threshold', async () => {
      const storage = createTrialStorage('trial', trialPeriod(26, '2026-06-14'));
      const warnings: string[] = [];
      const handler = createHandler(storage.repository, warnings);
      handler.initialize(() => {});
      await flushPromises();
      expect(warnings).toEqual([]);

      handler.recordPanelUse();

      expect(warnings).toHaveLength(1);
      expect(storage.store.trialWarningThreshold).toBe(3);
    });

    it('does not warn when no day was recorded', async () => {
      // 3 days remain, but the threshold has not been warned about yet:
      // only recording a new day may send the warning.
      const storage = createTrialStorage('trial', trialPeriod(27, '2026-06-15'));
      const warnings: string[] = [];
      const handler = createHandler(storage.repository, warnings);
      handler.initialize(() => {});
      await flushPromises();

      handler.recordPanelUse();

      expect(storage.savedTrialPeriods).toEqual([]);
      expect(warnings).toEqual([]);
    });
  });

  it('does not record a trial day on initialize', async () => {
    const storage = createTrialStorage('trial', trialPeriod(5, '2026-06-14'));
    const handler = createHandler(storage.repository);

    handler.initialize(() => {});
    await flushPromises();

    expect(storage.savedTrialPeriods).toEqual([]);
    expect(storage.store.trialPeriod.daysUsed.toNumber()).toBe(5);
  });
});
