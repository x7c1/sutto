export interface LayoutEvent {
  timestamp: number;
  collectionId: string;
  wmClassHash: string;
  titleHash: string;
  layoutId: string;
}

export function compactEvents(events: LayoutEvent[], maxPerWmClass: number): LayoutEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const wmClassEntries = new Map<string, LayoutEntry[]>();
  const titleEntries = new Map<string, LayoutEntry>();

  for (const event of sorted) {
    const { collectionId, wmClassHash, titleHash, layoutId, timestamp } = event;

    const wmClassKey = `${collectionId}:${wmClassHash}`;
    let entries = wmClassEntries.get(wmClassKey);
    if (!entries) {
      entries = [];
      wmClassEntries.set(wmClassKey, entries);
    }
    const existingIndex = entries.findIndex((e) => e.layoutId === layoutId);
    if (existingIndex !== -1) {
      entries.splice(existingIndex, 1);
    }
    entries.unshift({ layoutId, lastUsed: timestamp });
    if (entries.length > maxPerWmClass) {
      entries.length = maxPerWmClass;
    }

    const titleKey = `${collectionId}:${wmClassHash}:${titleHash}`;
    titleEntries.set(titleKey, { layoutId, lastUsed: timestamp });
  }

  const keepLayoutIds = new Map<string, Set<string>>();
  for (const [wmClassKey, entries] of wmClassEntries) {
    keepLayoutIds.set(wmClassKey, new Set(entries.map((e) => e.layoutId)));
  }

  const latestByTitle = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const titleKey = `${event.collectionId}:${event.wmClassHash}:${event.titleHash}`;
    latestByTitle.set(titleKey, event);
  }

  const latestByWmClassLayout = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const key = `${event.collectionId}:${event.wmClassHash}:${event.layoutId}`;
    latestByWmClassLayout.set(key, event);
  }

  const keepSet = new Set<LayoutEvent>();
  for (const event of latestByTitle.values()) {
    keepSet.add(event);
  }
  for (const event of latestByWmClassLayout.values()) {
    const wmClassKey = `${event.collectionId}:${event.wmClassHash}`;
    if (keepLayoutIds.get(wmClassKey)?.has(event.layoutId)) {
      keepSet.add(event);
    }
  }

  return [...keepSet].sort((a, b) => a.timestamp - b.timestamp);
}

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}
