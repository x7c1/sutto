import { describe, expect, it } from 'vitest';
import { CollectionId } from '../layout/collection-id.js';
import { LayoutId } from '../layout/layout-id.js';
import { InvalidLayoutEventError, LayoutEvent } from './layout-event.js';

describe('LayoutEvent', () => {
  const validCollectionId = new CollectionId('550e8400-e29b-41d4-a716-446655440000');
  const validLayoutId = new LayoutId('660e8400-e29b-41d4-a716-446655440000');

  describe('constructor', () => {
    it('creates a valid layout event', () => {
      const event = new LayoutEvent({
        timestamp: 1234567890,
        collectionId: validCollectionId,
        wmClassHash: 'abcd1234abcd1234',
        titleHash: 'efgh5678efgh5678',
        layoutId: validLayoutId,
      });

      expect(event.timestamp).toBe(1234567890);
      expect(event.collectionId).toBe(validCollectionId);
      expect(event.wmClassHash).toBe('abcd1234abcd1234');
      expect(event.titleHash).toBe('efgh5678efgh5678');
      expect(event.layoutId).toBe(validLayoutId);
    });

    it('throws InvalidLayoutEventError for negative timestamp', () => {
      expect(
        () =>
          new LayoutEvent({
            timestamp: -1,
            collectionId: validCollectionId,
            wmClassHash: 'abcd1234',
            titleHash: 'efgh5678',
            layoutId: validLayoutId,
          })
      ).toThrow(InvalidLayoutEventError);
    });

    it('throws InvalidLayoutEventError for empty wmClassHash', () => {
      expect(
        () =>
          new LayoutEvent({
            timestamp: 1234567890,
            collectionId: validCollectionId,
            wmClassHash: '',
            titleHash: 'efgh5678',
            layoutId: validLayoutId,
          })
      ).toThrow(InvalidLayoutEventError);
    });

    it('throws InvalidLayoutEventError for empty titleHash', () => {
      expect(
        () =>
          new LayoutEvent({
            timestamp: 1234567890,
            collectionId: validCollectionId,
            wmClassHash: 'abcd1234',
            titleHash: '',
            layoutId: validLayoutId,
          })
      ).toThrow(InvalidLayoutEventError);
    });
  });

  describe('fromRaw', () => {
    it('creates event from valid raw object', () => {
      const raw = {
        timestamp: 1234567890,
        collectionId: '550e8400-e29b-41d4-a716-446655440000',
        wmClassHash: 'abcd1234abcd1234',
        titleHash: 'efgh5678efgh5678',
        layoutId: '660e8400-e29b-41d4-a716-446655440000',
      };

      const event = LayoutEvent.fromRaw(raw);

      expect(event.timestamp).toBe(1234567890);
      expect(event.collectionId.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(event.layoutId.toString()).toBe('660e8400-e29b-41d4-a716-446655440000');
    });

    it('throws InvalidLayoutEventError for non-object input', () => {
      expect(() => LayoutEvent.fromRaw(null)).toThrow(InvalidLayoutEventError);
      expect(() => LayoutEvent.fromRaw('string')).toThrow(InvalidLayoutEventError);
    });

    it('throws InvalidLayoutEventError for missing fields', () => {
      expect(() => LayoutEvent.fromRaw({ timestamp: 123 })).toThrow(InvalidLayoutEventError);
    });

    it('throws for invalid collectionId format', () => {
      const raw = {
        timestamp: 1234567890,
        collectionId: 'invalid-uuid',
        wmClassHash: 'abcd1234',
        titleHash: 'efgh5678',
        layoutId: '660e8400-e29b-41d4-a716-446655440000',
      };

      expect(() => LayoutEvent.fromRaw(raw)).toThrow();
    });
  });
});
