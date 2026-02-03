import { describe, expect, it } from 'vitest';
import { Trial } from './trial.js';
import { TrialDays } from './trial-days.js';

describe('Trial', () => {
  describe('initial', () => {
    it('creates trial with 0 days used and empty lastUsedDate', () => {
      const trial = Trial.initial();
      expect(trial.daysUsed.toNumber()).toBe(0);
      expect(trial.lastUsedDate).toBe('');
    });
  });

  describe('create', () => {
    it('creates trial with specified props', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-15',
      });
      expect(trial.daysUsed.toNumber()).toBe(10);
      expect(trial.lastUsedDate).toBe('2026-01-15');
    });
  });

  describe('getRemainingDays', () => {
    it('returns remaining days from TrialDays', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-15',
      });
      expect(trial.getRemainingDays()).toBe(20);
    });
  });

  describe('isExpired', () => {
    it('returns false when not expired', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(29),
        lastUsedDate: '2026-01-15',
      });
      expect(trial.isExpired()).toBe(false);
    });

    it('returns true when expired', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(30),
        lastUsedDate: '2026-01-15',
      });
      expect(trial.isExpired()).toBe(true);
    });
  });

  describe('canRecordUsage', () => {
    it('returns true for new day when not expired', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-14',
      });
      expect(trial.canRecordUsage('2026-01-15')).toBe(true);
    });

    it('returns false if already used today', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-15',
      });
      expect(trial.canRecordUsage('2026-01-15')).toBe(false);
    });

    it('returns false if expired', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(30),
        lastUsedDate: '2026-01-14',
      });
      expect(trial.canRecordUsage('2026-01-15')).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('increments days and updates lastUsedDate', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-14',
      });
      const updated = trial.recordUsage('2026-01-15');

      expect(updated.daysUsed.toNumber()).toBe(11);
      expect(updated.lastUsedDate).toBe('2026-01-15');
    });

    it('returns same instance if already used today', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-15',
      });
      const updated = trial.recordUsage('2026-01-15');

      expect(updated).toBe(trial);
      expect(updated.daysUsed.toNumber()).toBe(10);
    });

    it('is immutable - original not modified', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(10),
        lastUsedDate: '2026-01-14',
      });
      trial.recordUsage('2026-01-15');

      expect(trial.daysUsed.toNumber()).toBe(10);
      expect(trial.lastUsedDate).toBe('2026-01-14');
    });
  });

  describe('reset', () => {
    it('returns initial trial state', () => {
      const trial = Trial.create({
        daysUsed: TrialDays.create(25),
        lastUsedDate: '2026-01-15',
      });
      const reset = trial.reset();

      expect(reset.daysUsed.toNumber()).toBe(0);
      expect(reset.lastUsedDate).toBe('');
    });
  });
});
