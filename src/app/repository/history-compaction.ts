export interface LayoutEvent {
  timestamp: number;
  wmClassHash: string;
  titleHash: string;
  layoutId: string;
}

export function compactEvents(events: LayoutEvent[], maxPerWmClass: number): LayoutEvent[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const wmClassEntries = new Map<string, LayoutEntry[]>();
  const titleEntries = new Map<string, LayoutEntry>();

  for (const event of sorted) {
    const { wmClassHash, titleHash, layoutId, timestamp } = event;

    let entries = wmClassEntries.get(wmClassHash);
    if (!entries) {
      entries = [];
      wmClassEntries.set(wmClassHash, entries);
    }
    const existingIndex = entries.findIndex((e) => e.layoutId === layoutId);
    if (existingIndex !== -1) {
      entries.splice(existingIndex, 1);
    }
    entries.unshift({ layoutId, lastUsed: timestamp });
    if (entries.length > maxPerWmClass) {
      entries.length = maxPerWmClass;
    }

    const titleKey = `${wmClassHash}:${titleHash}`;
    titleEntries.set(titleKey, { layoutId, lastUsed: timestamp });
  }

  const keepLayoutIds = new Map<string, Set<string>>();
  for (const [wmClassHash, entries] of wmClassEntries) {
    keepLayoutIds.set(wmClassHash, new Set(entries.map((e) => e.layoutId)));
  }

  const latestByTitle = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const titleKey = `${event.wmClassHash}:${event.titleHash}`;
    latestByTitle.set(titleKey, event);
  }

  const latestByWmClassLayout = new Map<string, LayoutEvent>();
  for (const event of sorted) {
    const key = `${event.wmClassHash}:${event.layoutId}`;
    latestByWmClassLayout.set(key, event);
  }

  const keepSet = new Set<LayoutEvent>();
  for (const event of latestByTitle.values()) {
    keepSet.add(event);
  }
  for (const event of latestByWmClassLayout.values()) {
    if (keepLayoutIds.get(event.wmClassHash)?.has(event.layoutId)) {
      keepSet.add(event);
    }
  }

  return [...keepSet].sort((a, b) => a.timestamp - b.timestamp);
}

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}
