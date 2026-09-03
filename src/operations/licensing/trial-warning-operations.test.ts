// Provide the GNOME Shell global log function for the test environment
globalThis.log = () => {};

import { describe, expect, it } from 'vitest';
import type { License, LicenseStatus } from '../../domain/licensing/index.js';
import { TrialDays, TrialPeriod } from '../../domain/licensing/index.js';
import type { NotificationService } from '../notification/index.js';
import type { LicenseRepository } from './license-repository.js';
import { TrialWarningOperations } from './trial-warning-operations.js';

const TRIAL_LENGTH_DAYS = 30;

interface RecordedNotification {
  title: string;
  details?: string;
}

function createMockRepository(options: {
  status: LicenseStatus;
  daysRemaining: number;
  trialWarningThreshold: number;
}): LicenseRepository {
  let trialWarningThreshold = options.trialWarningThreshold;
  const trialPeriod = new TrialPeriod({
    daysUsed: new TrialDays(TRIAL_LENGTH_DAYS - options.daysRemaining),
    lastUsedDate: '2026-06-15',
  });

  const notImplemented = (name: string) => (): never => {
    throw new Error(`${name} is not used by TrialWarningOperations`);
  };

  return {
    getStatus: () => options.status,
    setStatus: notImplemented('setStatus'),
    loadLicense: (): License | null => null,
    saveLicense: notImplemented('saveLicense'),
    loadTrialPeriod: () => trialPeriod,
    saveTrialPeriod: notImplemented('saveTrialPeriod'),
    getTrialWarningThreshold: () => trialWarningThreshold,
    setTrialWarningThreshold: (threshold: number) => {
      trialWarningThreshold = threshold;
    },
    clearLicense: notImplemented('clearLicense'),
  };
}

function createMockNotificationService(recorded: RecordedNotification[]): NotificationService {
  return {
    notifyError: (title, details) => recorded.push({ title, details }),
    notifyWarning: (title, details) => recorded.push({ title, details }),
  };
}

describe('TrialWarningOperations', () => {
  it('warns when the trial crosses the 3-day threshold and records it', () => {
    const repository = createMockRepository({
      status: 'trial',
      daysRemaining: 3,
      trialWarningThreshold: 0,
    });
    const recorded: RecordedNotification[] = [];

    new TrialWarningOperations(
      repository,
      createMockNotificationService(recorded)
    ).checkAndNotify();

    expect(recorded).toEqual([
      {
        title: 'Trial ending soon',
        details: 'Your Sutto trial ends in 3 days. Activate a license to keep using it.',
      },
    ]);
    expect(repository.getTrialWarningThreshold()).toBe(3);
  });

  it('does not warn again for a threshold already recorded', () => {
    const repository = createMockRepository({
      status: 'trial',
      daysRemaining: 3,
      trialWarningThreshold: 3,
    });
    const recorded: RecordedNotification[] = [];

    new TrialWarningOperations(
      repository,
      createMockNotificationService(recorded)
    ).checkAndNotify();

    expect(recorded).toEqual([]);
    expect(repository.getTrialWarningThreshold()).toBe(3);
  });

  it('warns again when the trial crosses the 1-day threshold', () => {
    const repository = createMockRepository({
      status: 'trial',
      daysRemaining: 1,
      trialWarningThreshold: 3,
    });
    const recorded: RecordedNotification[] = [];

    new TrialWarningOperations(
      repository,
      createMockNotificationService(recorded)
    ).checkAndNotify();

    expect(recorded).toEqual([
      {
        title: 'Trial ending soon',
        details: 'Your Sutto trial ends in 1 day. Activate a license to keep using it.',
      },
    ]);
    expect(repository.getTrialWarningThreshold()).toBe(1);
  });

  it('does not warn while the trial has plenty of days left', () => {
    const repository = createMockRepository({
      status: 'trial',
      daysRemaining: 10,
      trialWarningThreshold: 0,
    });
    const recorded: RecordedNotification[] = [];

    new TrialWarningOperations(
      repository,
      createMockNotificationService(recorded)
    ).checkAndNotify();

    expect(recorded).toEqual([]);
  });

  it('resets the recorded threshold once the status leaves trial', () => {
    const repository = createMockRepository({
      status: 'valid',
      daysRemaining: 1,
      trialWarningThreshold: 3,
    });
    const recorded: RecordedNotification[] = [];

    new TrialWarningOperations(
      repository,
      createMockNotificationService(recorded)
    ).checkAndNotify();

    expect(recorded).toEqual([]);
    expect(repository.getTrialWarningThreshold()).toBe(0);
  });
});
