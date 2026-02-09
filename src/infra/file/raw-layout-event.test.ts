import { describe, expect, it } from 'vitest';
import { LayoutEvent } from '../../domain/history/index.js';
import { CollectionId } from '../../domain/layout/collection-id.js';
import { LayoutId } from '../../domain/layout/layout-id.js';
import { toRawLayoutEvent } from './raw-layout-event.js';

describe('toRawLayoutEvent', () => {
  it('converts LayoutEvent to raw object', () => {
    const collectionId = new CollectionId('550e8400-e29b-41d4-a716-446655440000');
    const layoutId = new LayoutId('660e8400-e29b-41d4-a716-446655440000');

    const event = new LayoutEvent({
      timestamp: 1234567890,
      collectionId,
      wmClassHash: 'abcd1234abcd1234',
      titleHash: 'efgh5678efgh5678',
      layoutId,
    });

    const raw = toRawLayoutEvent(event);

    expect(raw.timestamp).toBe(1234567890);
    expect(raw.collectionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(raw.wmClassHash).toBe('abcd1234abcd1234');
    expect(raw.titleHash).toBe('efgh5678efgh5678');
    expect(raw.layoutId).toBe('660e8400-e29b-41d4-a716-446655440000');
  });
});
