import { describe, expect, it } from 'vitest';
import { ActivationId, InvalidActivationIdError } from './activation-id.js';

describe('ActivationId', () => {
  const validUUID = '550e8400-e29b-41d4-a716-446655440000';

  describe('constructor', () => {
    it('creates a valid activation ID from UUID string', () => {
      const id = new ActivationId(validUUID);
      expect(id.toString()).toBe(validUUID.toLowerCase());
    });

    it('normalizes UUID to lowercase', () => {
      const id = new ActivationId('550E8400-E29B-41D4-A716-446655440000');
      expect(id.toString()).toBe(validUUID);
    });

    it('trims whitespace from input', () => {
      const id = new ActivationId(`  ${validUUID}  `);
      expect(id.toString()).toBe(validUUID);
    });

    it('throws InvalidActivationIdError for invalid UUID format', () => {
      expect(() => new ActivationId('not-a-uuid')).toThrow(InvalidActivationIdError);
      expect(() => new ActivationId('550e8400-e29b-41d4-a716')).toThrow(InvalidActivationIdError);
      expect(() => new ActivationId('')).toThrow(InvalidActivationIdError);
    });
  });

  describe('equals', () => {
    it('returns true for equal IDs', () => {
      const id1 = new ActivationId(validUUID);
      const id2 = new ActivationId(validUUID);
      expect(id1.equals(id2)).toBe(true);
    });

    it('returns false for different IDs', () => {
      const id1 = new ActivationId(validUUID);
      const id2 = new ActivationId('660e8400-e29b-41d4-a716-446655440000');
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
