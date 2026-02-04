import { describe, expect, it } from 'vitest';
import { CollectionId, InvalidCollectionIdError } from './collection-id.js';

describe('CollectionId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('constructor', () => {
    it('creates a valid collection ID from UUID string', () => {
      const id = new CollectionId(validUUID);
      expect(id.toString()).toBe(validUUID);
    });

    it('normalizes UUID to lowercase', () => {
      const id = new CollectionId('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidCollectionIdError for invalid UUID format', () => {
      expect(() => new CollectionId('not-a-uuid')).toThrow(InvalidCollectionIdError);
      expect(() => new CollectionId('')).toThrow(InvalidCollectionIdError);
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = new CollectionId(validUUID);
      const id2 = new CollectionId(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = new CollectionId(validUUID);
      const id2 = new CollectionId('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
