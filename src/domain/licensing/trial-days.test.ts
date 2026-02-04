import { describe, expect, it } from 'vitest';
import { InvalidTrialDaysError, TrialDays } from './trial-days.js';

describe('TrialDays', () => {
  describe('constructor', () => {
    it('creates valid trial days from integer in range', () => {
      const days = new TrialDays(15);
      expect(days.toNumber()).toBe(15);
    });

    it('accepts boundary values 0 and 30', () => {
      expect(new TrialDays(0).toNumber()).toBe(0);
      expect(new TrialDays(30).toNumber()).toBe(30);
    });

    it('throws InvalidTrialDaysError for negative numbers', () => {
      expect(() => new TrialDays(-1)).toThrow(InvalidTrialDaysError);
    });

    it('throws InvalidTrialDaysError for numbers above 30', () => {
      expect(() => new TrialDays(31)).toThrow(InvalidTrialDaysError);
    });

    it('throws InvalidTrialDaysError for non-integers', () => {
      expect(() => new TrialDays(15.5)).toThrow(InvalidTrialDaysError);
    });
  });

  describe('zero', () => {
    it('creates trial days with value 0', () => {
      const days = TrialDays.zero();
      expect(days.toNumber()).toBe(0);
    });
  });

  describe('increment', () => {
    it('increments days by 1', () => {
      const days = new TrialDays(10);
      const incremented = days.increment();
      expect(incremented.toNumber()).toBe(11);
    });

    it('does not increment beyond 30', () => {
      const days = new TrialDays(30);
      const incremented = days.increment();
      expect(incremented.toNumber()).toBe(30);
    });

    it('returns a new instance (immutable)', () => {
      const days = new TrialDays(10);
      const incremented = days.increment();
      expect(days.toNumber()).toBe(10);
      expect(incremented.toNumber()).toBe(11);
    });
  });

  describe('remaining', () => {
    it('calculates remaining days correctly', () => {
      expect(new TrialDays(0).remaining()).toBe(30);
      expect(new TrialDays(10).remaining()).toBe(20);
      expect(new TrialDays(30).remaining()).toBe(0);
    });
  });

  describe('isExpired', () => {
    it('returns false when days < 30', () => {
      expect(new TrialDays(0).isExpired()).toBe(false);
      expect(new TrialDays(29).isExpired()).toBe(false);
    });

    it('returns true when days = 30', () => {
      expect(new TrialDays(30).isExpired()).toBe(true);
    });
  });

  describe('equals', () => {
    it('returns true for equal values', () => {
      const days1 = new TrialDays(15);
      const days2 = new TrialDays(15);
      expect(days1.equals(days2)).toBe(true);
    });

    it('returns false for different values', () => {
      const days1 = new TrialDays(15);
      const days2 = new TrialDays(20);
      expect(days1.equals(days2)).toBe(false);
    });
  });
});
