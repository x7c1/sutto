import { describe, expect, it } from 'vitest';
import { InvalidLayoutIdError, LayoutId } from './layout-id.js';

describe('LayoutId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('constructor', () => {
    it('creates a valid layout ID from UUID string', () => {
      const id = new LayoutId(validUUID);
      expect(id.toString()).toBe(validUUID);
    });

    it('normalizes UUID to lowercase', () => {
      const id = new LayoutId('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidLayoutIdError for invalid UUID format', () => {
      expect(() => new LayoutId('not-a-uuid')).toThrow(InvalidLayoutIdError);
      expect(() => new LayoutId('')).toThrow(InvalidLayoutIdError);
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = new LayoutId(validUUID);
      const id2 = new LayoutId(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = new LayoutId(validUUID);
      const id2 = new LayoutId('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
