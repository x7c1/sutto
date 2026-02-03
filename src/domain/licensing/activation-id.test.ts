import { describe, expect, it } from 'vitest';
import { ActivationId, InvalidActivationIdError } from './activation-id.js';

describe('ActivationId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('create', () => {
    it('creates a valid activation ID from UUID string', () => {
      const id = ActivationId.create(validUUID);
      expect(id.toString()).toBe(validUUID.toLowerCase());
    });

    it('normalizes UUID to lowercase', () => {
      const id = ActivationId.create('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('trims whitespace from input', () => {
      const id = ActivationId.create(`  ${validUUID}  `);
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidActivationIdError for invalid UUID format', () => {
      expect(() => ActivationId.create('not-a-uuid')).toThrow(InvalidActivationIdError);
      expect(() => ActivationId.create('550e8400-e29b-41d4-a716')).toThrow(
        InvalidActivationIdError
      );
      expect(() => ActivationId.create('')).toThrow(InvalidActivationIdError);
    });

    it('throws InvalidActivationIdError for non-string input', () => {
      expect(() => ActivationId.create(null)).toThrow(InvalidActivationIdError);
      expect(() => ActivationId.create(123)).toThrow(InvalidActivationIdError);
    });
  });

  describe('tryCreate', () => {
    it('returns ActivationId for valid input', () => {
      const id = ActivationId.tryCreate(validUUID);
      expect(id).not.toBeNull();
      expect(id?.toString()).toBe(validUUID);
    });

    it('returns null for invalid input', () => {
      expect(ActivationId.tryCreate('invalid')).toBeNull();
      expect(ActivationId.tryCreate(null)).toBeNull();
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = ActivationId.create(validUUID);
      const id2 = ActivationId.create(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = ActivationId.create(validUUID);
      const id2 = ActivationId.create('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
