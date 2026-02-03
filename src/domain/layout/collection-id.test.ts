import { describe, expect, it } from 'vitest';
import { CollectionId, InvalidCollectionIdError } from './collection-id.js';

describe('CollectionId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('create', () => {
    it('creates a valid collection ID from UUID string', () => {
      const id = CollectionId.create(validUUID);
      expect(id.toString()).toBe(validUUID);
    });

    it('normalizes UUID to lowercase', () => {
      const id = CollectionId.create('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidCollectionIdError for invalid UUID format', () => {
      expect(() => CollectionId.create('not-a-uuid')).toThrow(InvalidCollectionIdError);
      expect(() => CollectionId.create('')).toThrow(InvalidCollectionIdError);
    });

    it('throws InvalidCollectionIdError for non-string input', () => {
      expect(() => CollectionId.create(null)).toThrow(InvalidCollectionIdError);
      expect(() => CollectionId.create(123)).toThrow(InvalidCollectionIdError);
    });
  });

  describe('tryCreate', () => {
    it('returns CollectionId for valid input', () => {
      const id = CollectionId.tryCreate(validUUID);
      expect(id).not.toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(CollectionId.tryCreate('invalid')).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = CollectionId.create(validUUID);
      const id2 = CollectionId.create(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = CollectionId.create(validUUID);
      const id2 = CollectionId.create('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
