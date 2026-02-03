import { describe, expect, it } from 'vitest';
import { InvalidLicenseKeyError, LicenseKey } from './license-key.js';

describe('LicenseKey', () => {
  describe('create', () => {
    it('creates a valid license key from non-empty string', () => {
      const key = LicenseKey.create('ABC-123-XYZ');
      expect(key.toString()).toBe('ABC-123-XYZ');
    });

    it('trims whitespace from input', () => {
      const key = LicenseKey.create('  ABC-123  ');
      expect(key.toString()).toBe('ABC-123');
    });

    it('throws InvalidLicenseKeyError for empty string', () => {
      expect(() => LicenseKey.create('')).toThrow(InvalidLicenseKeyError);
      expect(() => LicenseKey.create('   ')).toThrow(InvalidLicenseKeyError);
    });

    it('throws InvalidLicenseKeyError for non-string input', () => {
      expect(() => LicenseKey.create(null)).toThrow(InvalidLicenseKeyError);
      expect(() => LicenseKey.create(undefined)).toThrow(InvalidLicenseKeyError);
      expect(() => LicenseKey.create(123)).toThrow(InvalidLicenseKeyError);
    });
  });

  describe('tryCreate', () => {
    it('returns LicenseKey for valid input', () => {
      const key = LicenseKey.tryCreate('ABC-123');
      expect(key).not.toBeNull();
      expect(key?.toString()).toBe('ABC-123');
    });

    it('returns null for invalid input', () => {
      expect(LicenseKey.tryCreate('')).toBeNull();
      expect(LicenseKey.tryCreate(null)).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for equal keys', () => {
      const key1 = LicenseKey.create('ABC-123');
      const key2 = LicenseKey.create('ABC-123');
      expect(key1.equals(key2)).toBe(true);
    });

    it('returns false for different keys', () => {
      const key1 = LicenseKey.create('ABC-123');
      const key2 = LicenseKey.create('XYZ-789');
      expect(key1.equals(key2)).toBe(false);
    });
  });
});
