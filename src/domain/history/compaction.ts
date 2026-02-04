import type { LayoutEvent } from './layout-event.js';

/**
 * Compacts layout events by removing duplicates and limiting entries per wmClass.
 *
 * The algorithm:
 * 1. Keeps only the latest event for each unique title (collectionId + wmClassHash + titleHash)
 * 2. Limits the number of distinct layoutIds per wmClass (collectionId + wmClassHash) to maxPerWmClass
 * 3. Uses LRU ordering - most recently used layoutIds are kept
 *
 * @param events - Array of layout events to compact
 * @param maxPerWmClass - Maximum number of distinct layoutIds to keep per wmClass
 * @returns Compacted array of events sorted by timestamp
 */
export function compactEvents(events: LayoutEvent[], maxPerWmClass: number): LayoutEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const wmClassEntries = new Map<string, LayoutEntry[]>();
  const titleEntries = new Map<string, LayoutEntry>();

  for (const event of sorted) {
    const collectionId = event.collectionId.toString();
    const layoutId = event.layoutId.toString();

    const wmClassKey = `${collectionId}:${event.wmClassHash}`;
    let entries = wmClassEntries.get(wmClassKey);
    if (!entries) {
      entries = [];
      wmClassEntries.set(wmClassKey, entries);
    }
    const existingIndex = entries.findIndex((e) => e.layoutId === layoutId);
    if (existingIndex !== -1) {
      entries.splice(existingIndex, 1);
    }
    entries.unshift({ layoutId, lastUsed: event.timestamp });
    if (entries.length > maxPerWmClass) {
      entries.length = maxPerWmClass;
    }

    const titleKey = `${collectionId}:${event.wmClassHash}:${event.titleHash}`;
    titleEntries.set(titleKey, { layoutId, lastUsed: event.timestamp });
  }

  const keepLayoutIds = new Map<string, Set<string>>();
  for (const [wmClassKey, entries] of wmClassEntries) {
    keepLayoutIds.set(wmClassKey, new Set(entries.map((e) => e.layoutId)));
  }

  const latestByTitle = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const titleKey = `${event.collectionId.toString()}:${event.wmClassHash}:${event.titleHash}`;
    latestByTitle.set(titleKey, event);
  }

  const latestByWmClassLayout = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const key = `${event.collectionId.toString()}:${event.wmClassHash}:${event.layoutId.toString()}`;
    latestByWmClassLayout.set(key, event);
  }

  const keepSet = new Set<LayoutEvent>();
  for (const event of latestByTitle.values()) {
    keepSet.add(event);
  }
  for (const event of latestByWmClassLayout.values()) {
    const wmClassKey = `${event.collectionId.toString()}:${event.wmClassHash}`;
    if (keepLayoutIds.get(wmClassKey)?.has(event.layoutId.toString())) {
      keepSet.add(event);
    }
  }

  return [...keepSet].sort((a, b) => a.timestamp - b.timestamp);
}

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}
