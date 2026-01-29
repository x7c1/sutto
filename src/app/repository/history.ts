import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { HISTORY_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from './extension-path.js';
import { compactEvents, type LayoutEvent } from './history-compaction.js';
import { loadAllCollections } from './space-collection.js';

declare function log(message: string): void;

/**
 * LayoutHistoryRepository
 *
 * Manages layout selection history using an event log approach.
 * Events are stored as JSONL (append-only), and in-memory structures
 * are built at startup for efficient lookups.
 */
export class LayoutHistoryRepository {
  private memory: LayoutHistoryMemory = {
    byWindowId: new Map(),
    byWmClassHash: new Map(),
    byTitleHash: new Map(),
  };
  private events: LayoutEvent[] = [];
  private filePath: string;
  private activeCollectionId: string = '';

  constructor() {
    this.filePath = getExtensionDataPath(HISTORY_FILE_NAME);
  }

  setActiveCollection(collectionId: string): void {
    if (this.activeCollectionId !== collectionId) {
      // Clear volatile byWindowId cache when collection changes
      // to avoid returning layout IDs from a different collection
      this.memory.byWindowId.clear();
      this.activeCollectionId = collectionId;
    }
  }

  load(): void {
    let events = this.readEventsFromFile();
    if (events.length === 0) {
      return;
    }

    const originalCount = events.length;
    const validLayoutIds = getAllValidLayoutIds();
    events = events.filter((e) => validLayoutIds.has(e.layoutId));

    const didFilter = events.length < originalCount;
    if (didFilter) {
      log(`[LayoutHistory] Removed ${originalCount - events.length} events with invalid layoutId`);
    }

    let didCompact = false;
    if (events.length > COMPACTION_THRESHOLD) {
      const beforeCompact = events.length;
      events = compactEvents(events, MAX_LAYOUTS_PER_WM_CLASS);
      didCompact = true;
      log(`[LayoutHistory] Compacted ${beforeCompact} to ${events.length} events`);
    }

    if (didFilter || didCompact) {
      this.writeEventsToFile(events);
    }

    events.sort((a, b) => a.timestamp - b.timestamp);
    this.events = events;
    this.buildMemoryStructures();

    log(`[LayoutHistory] Loaded ${this.events.length} events`);
  }

  setSelectedLayout(windowId: number, wmClass: string, title: string, layoutId: string): void {
    if (!wmClass) {
      log('[LayoutHistory] wmClass is empty, skipping history update');
      return;
    }

    if (!this.activeCollectionId) {
      log('[LayoutHistory] activeCollectionId is not set, skipping history update');
      return;
    }

    this.memory.byWindowId.set(windowId, layoutId);

    const event: LayoutEvent = {
      timestamp: Date.now(),
      collectionId: this.activeCollectionId,
      wmClassHash: hashString(wmClass),
      titleHash: hashString(title),
      layoutId,
    };

    this.appendEvent(event);
    this.updateMemoryWithEvent(event);

    log(
      `[LayoutHistory] Recorded: collection=${event.collectionId}, wmClassHash=${event.wmClassHash}, titleHash=${event.titleHash} -> ${layoutId}`
    );
  }

  getSelectedLayoutId(windowId: number, wmClass: string, title: string): string | null {
    if (!wmClass) {
      return null;
    }

    const byWindowId = this.memory.byWindowId.get(windowId);
    if (byWindowId) {
      return byWindowId;
    }

    if (!this.activeCollectionId) {
      return null;
    }

    const wmClassHash = hashString(wmClass);
    const titleHash = hashString(title);

    const titleKey = `${this.activeCollectionId}:${wmClassHash}:${titleHash}`;
    const byTitle = this.memory.byTitleHash.get(titleKey);
    if (byTitle) {
      return byTitle.layoutId;
    }

    const wmClassKey = `${this.activeCollectionId}:${wmClassHash}`;
    const byWmClass = this.memory.byWmClassHash.get(wmClassKey);
    if (byWmClass && byWmClass.length > 0) {
      return byWmClass[0].layoutId;
    }

    return null;
  }

  private readEventsFromFile(): LayoutEvent[] {
    const file = Gio.File.new_for_path(this.filePath);

    if (!file.query_exists(null)) {
      log('[LayoutHistory] History file does not exist');
      return [];
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (!success) {
        log('[LayoutHistory] Failed to load history file');
        return [];
      }

      const contentsString = new TextDecoder('utf-8').decode(contents);
      const lines = contentsString.split('\n').filter((line) => line.trim() !== '');

      const events: LayoutEvent[] = [];
      for (const line of lines) {
        try {
          events.push(JSON.parse(line) as LayoutEvent);
        } catch {
          log(`[LayoutHistory] Skipping invalid line: ${line}`);
        }
      }

      return events;
    } catch (e) {
      log(`[LayoutHistory] Error reading history file: ${e}`);
      return [];
    }
  }

  private writeEventsToFile(events: LayoutEvent[]): void {
    const tempPath = `${this.filePath}.tmp`;
    const tempFile = Gio.File.new_for_path(tempPath);
    const file = Gio.File.new_for_path(this.filePath);

    try {
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      const content = `${events.map((e) => JSON.stringify(e)).join('\n')}\n`;
      tempFile.replace_contents(
        new TextEncoder().encode(content),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );

      tempFile.move(file, Gio.FileCopyFlags.OVERWRITE, null, null);
    } catch (e) {
      log(`[LayoutHistory] Error writing events: ${e}`);
      try {
        if (tempFile.query_exists(null)) {
          tempFile.delete(null);
        }
      } catch {
        // Cleanup failure is not critical
      }
    }
  }

  private appendEvent(event: LayoutEvent): void {
    const file = Gio.File.new_for_path(this.filePath);

    try {
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      const line = `${JSON.stringify(event)}\n`;
      const outputStream = file.append_to(Gio.FileCreateFlags.NONE, null);
      outputStream.write_all(new TextEncoder().encode(line), null);
      outputStream.close(null);

      this.events.push(event);
    } catch (e) {
      log(`[LayoutHistory] Error appending event: ${e}`);
    }
  }

  private buildMemoryStructures(): void {
    // byWindowId is volatile - always starts fresh each session
    this.memory.byWindowId = new Map();
    this.memory.byWmClassHash = new Map();
    this.memory.byTitleHash = new Map();

    for (const event of this.events) {
      this.updateMemoryWithEvent(event);
    }
  }

  private updateMemoryWithEvent(event: LayoutEvent): void {
    const { collectionId, wmClassHash, titleHash, layoutId, timestamp } = event;

    const wmClassKey = `${collectionId}:${wmClassHash}`;
    let entries = this.memory.byWmClassHash.get(wmClassKey);
    if (!entries) {
      entries = [];
      this.memory.byWmClassHash.set(wmClassKey, entries);
    }

    const existingIndex = entries.findIndex((e) => e.layoutId === layoutId);
    if (existingIndex !== -1) {
      entries.splice(existingIndex, 1);
    }

    entries.unshift({ layoutId, lastUsed: timestamp });

    if (entries.length > MAX_LAYOUTS_PER_WM_CLASS) {
      entries.length = MAX_LAYOUTS_PER_WM_CLASS;
    }

    const titleKey = `${collectionId}:${wmClassHash}:${titleHash}`;
    this.memory.byTitleHash.set(titleKey, { layoutId, lastUsed: timestamp });
  }
}

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}

interface LayoutHistoryMemory {
  byWindowId: Map<number, string>;
  byWmClassHash: Map<string, LayoutEntry[]>;
  byTitleHash: Map<string, LayoutEntry>;
}

const MAX_LAYOUTS_PER_WM_CLASS = 5;
const COMPACTION_THRESHOLD = 5000;

function hashString(input: string): string {
  const checksum = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, input, -1);
  if (!checksum) {
    return '0000000000000000';
  }
  return checksum.substring(0, 16);
}

function getAllValidLayoutIds(): Set<string> {
  const ids = new Set<string>();
  const collections = loadAllCollections();

  for (const collection of collections) {
    for (const row of collection.rows) {
      for (const space of row.spaces) {
        for (const monitorKey in space.displays) {
          const layoutGroup = space.displays[monitorKey];
          for (const layout of layoutGroup.layouts) {
            ids.add(layout.id);
          }
        }
      }
    }
  }

  return ids;
}
