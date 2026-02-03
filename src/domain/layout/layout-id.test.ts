import { describe, expect, it } from 'vitest';
import { InvalidLayoutIdError, LayoutId } from './layout-id.js';

describe('LayoutId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('create', () => {
    it('creates a valid layout ID from UUID string', () => {
      const id = LayoutId.create(validUUID);
      expect(id.toString()).toBe(validUUID);
    });

    it('normalizes UUID to lowercase', () => {
      const id = LayoutId.create('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidLayoutIdError for invalid UUID format', () => {
      expect(() => LayoutId.create('not-a-uuid')).toThrow(InvalidLayoutIdError);
      expect(() => LayoutId.create('')).toThrow(InvalidLayoutIdError);
    });

    it('throws InvalidLayoutIdError for non-string input', () => {
      expect(() => LayoutId.create(null)).toThrow(InvalidLayoutIdError);
      expect(() => LayoutId.create(123)).toThrow(InvalidLayoutIdError);
    });
  });

  describe('tryCreate', () => {
    it('returns LayoutId for valid input', () => {
      const id = LayoutId.tryCreate(validUUID);
      expect(id).not.toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(LayoutId.tryCreate('invalid')).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = LayoutId.create(validUUID);
      const id2 = LayoutId.create(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = LayoutId.create(validUUID);
      const id2 = LayoutId.create('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
