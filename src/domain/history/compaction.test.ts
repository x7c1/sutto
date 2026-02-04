import { describe, expect, it } from 'vitest';

import { CollectionId } from '../layout/collection-id.js';
import { LayoutId } from '../layout/layout-id.js';
import { compactEvents } from './compaction.js';
import { LayoutEvent } from './layout-event.js';

// Generate deterministic UUIDs for testing
function uuid(n: number): string {
  const hex = n.toString(16).padStart(8, '0');
  return `${hex}-0000-0000-0000-000000000000`;
}

function event(
  timestamp: number,
  wmClassHash: string,
  titleHash: string,
  layoutNum: number,
  collectionNum: number = 0
): LayoutEvent {
  return new LayoutEvent({
    timestamp,
    collectionId: new CollectionId(uuid(collectionNum)),
    wmClassHash,
    titleHash,
    layoutId: new LayoutId(uuid(layoutNum)),
  });
}

describe('compactEvents', () => {
  it('returns empty array for empty input', () => {
    expect(compactEvents([], 5)).toEqual([]);
  });

  it('returns single event unchanged', () => {
    const events = [event(1000, 'wm1', 'title1', 1)];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(1000);
  });

  it('keeps events sorted by timestamp', () => {
    const events = [
      event(3000, 'wm1', 'title1', 1),
      event(1000, 'wm1', 'title2', 2),
      event(2000, 'wm1', 'title3', 3),
    ];
    const result = compactEvents(events, 5);
    expect(result.map((e) => e.timestamp)).toEqual([1000, 2000, 3000]);
  });

  it('keeps only latest event when same titleHash has multiple events', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1),
      event(2000, 'wm1', 'title1', 2),
      event(3000, 'wm1', 'title1', 3),
    ];
    const result = compactEvents(events, 1);
    expect(result).toHaveLength(1);
    expect(result[0].layoutId.toString()).toBe(uuid(3));
  });

  it('keeps all events when each has different titleHash', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1),
      event(2000, 'wm1', 'title2', 2),
      event(3000, 'wm1', 'title3', 3),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(3);
  });

  it('handles multiple wmClassHashes independently', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1),
      event(2000, 'wm2', 'title2', 2),
      event(3000, 'wm1', 'title3', 3),
      event(4000, 'wm2', 'title4', 4),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(4);
  });

  it('keeps only latest event when same layoutId used with same title multiple times', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1),
      event(2000, 'wm1', 'title1', 1),
      event(3000, 'wm1', 'title1', 1),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(3000);
  });

  it('evicts old layoutIds when maxPerWmClass exceeded', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1),
      event(2000, 'wm1', 'title1', 2),
      event(3000, 'wm1', 'title1', 3),
      event(4000, 'wm1', 'title1', 4),
    ];
    const result = compactEvents(events, 2);
    // layout3 and layout4 are in top 2 LRU, so both events are kept
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.layoutId.toString())).toEqual([uuid(3), uuid(4)]);
  });

  it('keeps event for titleHash even if layoutId evicted from wmClass LRU', () => {
    const events = [
      event(1000, 'wm1', 'titleA', 1),
      event(2000, 'wm1', 'titleB', 2),
      event(3000, 'wm1', 'titleC', 3),
    ];
    const result = compactEvents(events, 2);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.layoutId.toString())).toEqual([uuid(1), uuid(2), uuid(3)]);
  });

  it('does not modify input array', () => {
    const events = [event(3000, 'wm1', 'title1', 1), event(1000, 'wm1', 'title2', 2)];
    const original = [...events];
    compactEvents(events, 5);
    expect(events.map((e) => e.timestamp)).toEqual(original.map((e) => e.timestamp));
  });

  it('handles multiple collections independently', () => {
    const events = [
      event(1000, 'wm1', 'title1', 1, 1),
      event(2000, 'wm1', 'title1', 2, 2),
      event(3000, 'wm1', 'title1', 3, 1),
    ];
    const result = compactEvents(events, 1);
    // Each collection keeps its own latest event for the title
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.collectionId.toString())).toEqual([uuid(2), uuid(1)]);
    expect(result.map((e) => e.layoutId.toString())).toEqual([uuid(2), uuid(3)]);
  });

  it('counts maxPerWmClass per collection, not globally', () => {
    // Both collections have 3 layouts each, maxPerWmClass=2
    // If global: 6 layouts total -> keep only 2
    // If per-collection: each keeps 2 -> total 4
    const events = [
      event(1000, 'wm1', 'titleA', 1, 1),
      event(2000, 'wm1', 'titleA', 2, 1),
      event(3000, 'wm1', 'titleA', 3, 1),
      event(4000, 'wm1', 'titleA', 4, 2),
      event(5000, 'wm1', 'titleA', 5, 2),
      event(6000, 'wm1', 'titleA', 6, 2),
    ];
    const result = compactEvents(events, 2);
    // collection1: layout2, layout3 in LRU (layout1 evicted)
    // collection2: layout5, layout6 in LRU (layout4 evicted)
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.layoutId.toString())).toEqual([uuid(2), uuid(3), uuid(5), uuid(6)]);
  });
});
