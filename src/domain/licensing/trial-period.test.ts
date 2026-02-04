import { describe, expect, it } from 'vitest';
import { TrialDays } from './trial-days.js';
import { TrialPeriod } from './trial-period.js';

describe('TrialPeriod', () => {
  describe('initial', () => {
    it('creates trial period with 0 days used and empty lastUsedDate', () => {
      const period = TrialPeriod.initial();
      expect(period.daysUsed.toNumber()).toBe(0);
      expect(period.lastUsedDate).toBe('');
    });
  });

  describe('constructor', () => {
    it('creates trial period with specified props', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-15',
      });
      expect(period.daysUsed.toNumber()).toBe(10);
      expect(period.lastUsedDate).toBe('2026-01-15');
    });
  });

  describe('getRemainingDays', () => {
    it('returns remaining days from TrialDays', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-15',
      });
      expect(period.getRemainingDays()).toBe(20);
    });
  });

  describe('isExpired', () => {
    it('returns false when not expired', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(29),
        lastUsedDate: '2026-01-15',
      });
      expect(period.isExpired()).toBe(false);
    });

    it('returns true when expired', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(30),
        lastUsedDate: '2026-01-15',
      });
      expect(period.isExpired()).toBe(true);
    });
  });

  describe('canRecordUsage', () => {
    it('returns true for new day when not expired', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-14',
      });
      expect(period.canRecordUsage('2026-01-15')).toBe(true);
    });

    it('returns false if already used today', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-15',
      });
      expect(period.canRecordUsage('2026-01-15')).toBe(false);
    });

    it('returns false if expired', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(30),
        lastUsedDate: '2026-01-14',
      });
      expect(period.canRecordUsage('2026-01-15')).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('increments days and updates lastUsedDate', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-14',
      });
      const updated = period.recordUsage('2026-01-15');

      expect(updated.daysUsed.toNumber()).toBe(11);
      expect(updated.lastUsedDate).toBe('2026-01-15');
    });

    it('returns same instance if already used today', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-15',
      });
      const updated = period.recordUsage('2026-01-15');

      expect(updated).toBe(period);
      expect(updated.daysUsed.toNumber()).toBe(10);
    });

    it('is immutable - original not modified', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(10),
        lastUsedDate: '2026-01-14',
      });
      period.recordUsage('2026-01-15');

      expect(period.daysUsed.toNumber()).toBe(10);
      expect(period.lastUsedDate).toBe('2026-01-14');
    });
  });

  describe('reset', () => {
    it('returns initial trial period', () => {
      const period = new TrialPeriod({
        daysUsed: new TrialDays(25),
        lastUsedDate: '2026-01-15',
      });
      const reset = period.reset();

      expect(reset.daysUsed.toNumber()).toBe(0);
      expect(reset.lastUsedDate).toBe('');
    });
  });
});
