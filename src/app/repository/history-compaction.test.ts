import { describe, expect, it } from 'vitest';

import { compactEvents, type LayoutEvent } from './history-compaction.js';

function event(
  timestamp: number,
  wmClassHash: string,
  titleHash: string,
  layoutId: string,
  collectionId: string = 'default'
): LayoutEvent {
  return { timestamp, collectionId, wmClassHash, titleHash, layoutId };
}

describe('compactEvents', () => {
  it('returns empty array for empty input', () => {
    expect(compactEvents([], 5)).toEqual([]);
  });

  it('returns single event unchanged', () => {
    const events = [event(1000, 'wm1', 'title1', 'layout1')];
    expect(compactEvents(events, 5)).toEqual(events);
  });

  it('keeps events sorted by timestamp', () => {
    const events = [
      event(3000, 'wm1', 'title1', 'layout1'),
      event(1000, 'wm1', 'title2', 'layout2'),
      event(2000, 'wm1', 'title3', 'layout3'),
    ];
    const result = compactEvents(events, 5);
    expect(result.map((e) => e.timestamp)).toEqual([1000, 2000, 3000]);
  });

  it('keeps only latest event when same titleHash has multiple events', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1'),
      event(2000, 'wm1', 'title1', 'layout2'),
      event(3000, 'wm1', 'title1', 'layout3'),
    ];
    const result = compactEvents(events, 1);
    expect(result).toHaveLength(1);
    expect(result[0].layoutId).toBe('layout3');
  });

  it('keeps all events when each has different titleHash', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1'),
      event(2000, 'wm1', 'title2', 'layout2'),
      event(3000, 'wm1', 'title3', 'layout3'),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(3);
  });

  it('handles multiple wmClassHashes independently', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1'),
      event(2000, 'wm2', 'title2', 'layout2'),
      event(3000, 'wm1', 'title3', 'layout3'),
      event(4000, 'wm2', 'title4', 'layout4'),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(4);
  });

  it('keeps only latest event when same layoutId used with same title multiple times', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1'),
      event(2000, 'wm1', 'title1', 'layout1'),
      event(3000, 'wm1', 'title1', 'layout1'),
    ];
    const result = compactEvents(events, 5);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(3000);
  });

  it('evicts old layoutIds when maxPerWmClass exceeded', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1'),
      event(2000, 'wm1', 'title1', 'layout2'),
      event(3000, 'wm1', 'title1', 'layout3'),
      event(4000, 'wm1', 'title1', 'layout4'),
    ];
    const result = compactEvents(events, 2);
    // layout3 and layout4 are in top 2 LRU, so both events are kept
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.layoutId)).toEqual(['layout3', 'layout4']);
  });

  it('keeps event for titleHash even if layoutId evicted from wmClass LRU', () => {
    const events = [
      event(1000, 'wm1', 'titleA', 'layout1'),
      event(2000, 'wm1', 'titleB', 'layout2'),
      event(3000, 'wm1', 'titleC', 'layout3'),
    ];
    const result = compactEvents(events, 2);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.layoutId)).toEqual(['layout1', 'layout2', 'layout3']);
  });

  it('does not modify input array', () => {
    const events = [
      event(3000, 'wm1', 'title1', 'layout1'),
      event(1000, 'wm1', 'title2', 'layout2'),
    ];
    const original = [...events];
    compactEvents(events, 5);
    expect(events).toEqual(original);
  });

  it('handles multiple collections independently', () => {
    const events = [
      event(1000, 'wm1', 'title1', 'layout1', 'collection1'),
      event(2000, 'wm1', 'title1', 'layout2', 'collection2'),
      event(3000, 'wm1', 'title1', 'layout3', 'collection1'),
    ];
    const result = compactEvents(events, 1);
    // Each collection keeps its own latest event for the title
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.collectionId)).toEqual(['collection2', 'collection1']);
    expect(result.map((e) => e.layoutId)).toEqual(['layout2', 'layout3']);
  });

  it('counts maxPerWmClass per collection, not globally', () => {
    // Both collections have 3 layouts each, maxPerWmClass=2
    // If global: 6 layouts total -> keep only 2
    // If per-collection: each keeps 2 -> total 4
    const events = [
      event(1000, 'wm1', 'titleA', 'layout1', 'collection1'),
      event(2000, 'wm1', 'titleA', 'layout2', 'collection1'),
      event(3000, 'wm1', 'titleA', 'layout3', 'collection1'),
      event(4000, 'wm1', 'titleA', 'layout4', 'collection2'),
      event(5000, 'wm1', 'titleA', 'layout5', 'collection2'),
      event(6000, 'wm1', 'titleA', 'layout6', 'collection2'),
    ];
    const result = compactEvents(events, 2);
    // collection1: layout2, layout3 in LRU (layout1 evicted)
    // collection2: layout5, layout6 in LRU (layout4 evicted)
    expect(result).toHaveLength(4);
    expect(result.map((e) => e.layoutId)).toEqual(['layout2', 'layout3', 'layout5', 'layout6']);
  });
});
