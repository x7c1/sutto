// Provide the GNOME Shell global log function for the test environment
globalThis.log = () => {};

import { describe, expect, it } from 'vitest';
import type { DisabledReason, LicenseStatus } from '../../domain/licensing/index.js';
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
  const store: { status: LicenseStatus; license: License | null } = {
    status: 'expired',
    license: null,
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

function createHandler(repository: LicenseRepository): LicenseStateHandler {
  const apiClient: LicenseApiClient = {
    activate: unexpected('activate'),
    validate: unexpected('validate'),
  };
  const licenseOperations = new LicenseOperations(
    repository,
    apiClient,
    { now: () => new Date('2026-06-15T12:00:00Z'), today: () => '2026-06-15' },
    { getNetworkState: () => 'online' },
    { getDeviceId: () => new DeviceId('test-device'), getDeviceLabel: () => 'Test Device' }
  );
  const trialWarningOperations = new TrialWarningOperations(repository, {
    notifyError: () => {},
    notifyWarning: () => {},
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
});
