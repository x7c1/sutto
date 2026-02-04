import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { LayoutEvent, type WindowIdentifier } from '../../domain/history/index.js';
import { type CollectionId, LayoutId } from '../../domain/layout/index.js';
import type { LayoutHistoryRepository } from '../../usecase/history/index.js';
import { toRawLayoutEvent } from './layout-event-serializer.js';

declare function log(message: string): void;

const MAX_LAYOUTS_PER_WM_CLASS = 5;
const COMPACTION_THRESHOLD = 5000;

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}

interface LayoutHistoryMemory {
  byWindowId: Map<number, LayoutId>;
  byWmClassHash: Map<string, LayoutEntry[]>;
  byTitleHash: Map<string, LayoutEntry>;
}

/**
 * File-based implementation of LayoutHistoryRepository
 * Uses JSONL format for append-only event storage
 */
export class FileLayoutHistoryRepository implements LayoutHistoryRepository {
  private memory: LayoutHistoryMemory = {
    byWindowId: new Map(),
    byWmClassHash: new Map(),
    byTitleHash: new Map(),
  };
  private events: LayoutEvent[] = [];
  private filePath: string;
  private activeCollectionId: CollectionId | null = null;
  private validLayoutIds: Set<string>;

  constructor(filePath: string, validLayoutIds: Set<string>) {
    this.filePath = filePath;
    this.validLayoutIds = validLayoutIds;
  }

  setActiveCollection(collectionId: CollectionId): void {
    if (this.activeCollectionId === null || !this.activeCollectionId.equals(collectionId)) {
      this.memory.byWindowId.clear();
      this.activeCollectionId = collectionId;
    }
  }

  restoreHistory(): void {
    let events = this.readEventsFromFile();
    if (events.length === 0) {
      return;
    }

    const originalCount = events.length;
    events = events.filter((e) => this.validLayoutIds.has(e.layoutId.toString()));

    const didFilter = events.length < originalCount;
    if (didFilter) {
      log(`[LayoutHistory] Removed ${originalCount - events.length} events with invalid layoutId`);
    }

    let didCompact = false;
    if (events.length > COMPACTION_THRESHOLD) {
      const beforeCompact = events.length;
      events = this.compactEvents(events);
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

  setSelectedLayout(target: WindowIdentifier, layoutId: LayoutId): void {
    if (!target.wmClass) {
      log('[LayoutHistory] wmClass is empty, skipping history update');
      return;
    }

    if (!this.activeCollectionId) {
      log('[LayoutHistory] activeCollectionId is not set, skipping history update');
      return;
    }

    this.memory.byWindowId.set(target.windowId, layoutId);

    const event = new LayoutEvent({
      timestamp: Date.now(),
      collectionId: this.activeCollectionId,
      wmClassHash: this.hashString(target.wmClass),
      titleHash: this.hashString(target.title),
      layoutId,
    });

    this.appendEvent(event);
    this.updateMemoryWithEvent(event);

    log(
      `[LayoutHistory] Recorded: collection=${event.collectionId.toString()}, wmClassHash=${event.wmClassHash}, titleHash=${event.titleHash} -> ${layoutId.toString()}`
    );
  }

  getSelectedLayoutId(target: WindowIdentifier): LayoutId | null {
    if (!target.wmClass) {
      return null;
    }

    const byWindowId = this.memory.byWindowId.get(target.windowId);
    if (byWindowId) {
      return byWindowId;
    }

    if (!this.activeCollectionId) {
      return null;
    }

    const wmClassHash = this.hashString(target.wmClass);
    const titleHash = this.hashString(target.title);

    const titleKey = `${this.activeCollectionId.toString()}:${wmClassHash}:${titleHash}`;
    const byTitle = this.memory.byTitleHash.get(titleKey);
    if (byTitle) {
      return new LayoutId(byTitle.layoutId);
    }

    const wmClassKey = `${this.activeCollectionId.toString()}:${wmClassHash}`;
    const byWmClass = this.memory.byWmClassHash.get(wmClassKey);
    if (byWmClass && byWmClass.length > 0) {
      return new LayoutId(byWmClass[0].layoutId);
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
          const parsed: unknown = JSON.parse(line);
          events.push(LayoutEvent.fromRaw(parsed));
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

      const content = `${events.map((e) => JSON.stringify(toRawLayoutEvent(e))).join('\n')}\n`;
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

      const line = `${JSON.stringify(toRawLayoutEvent(event))}\n`;
      const outputStream = file.append_to(Gio.FileCreateFlags.NONE, null);
      outputStream.write_all(new TextEncoder().encode(line), null);
      outputStream.close(null);

      this.events.push(event);
    } catch (e) {
      log(`[LayoutHistory] Error appending event: ${e}`);
    }
  }

  private buildMemoryStructures(): void {
    this.memory.byWindowId = new Map();
    this.memory.byWmClassHash = new Map();
    this.memory.byTitleHash = new Map();

    for (const event of this.events) {
      this.updateMemoryWithEvent(event);
    }
  }

  private updateMemoryWithEvent(event: LayoutEvent): void {
    const collectionId = event.collectionId.toString();
    const { wmClassHash, titleHash, timestamp } = event;
    const layoutId = event.layoutId.toString();

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

  private compactEvents(events: LayoutEvent[]): LayoutEvent[] {
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    const wmClassEntries = new Map<string, LayoutEntry[]>();
    const titleEntries = new Map<string, LayoutEntry>();

    for (const event of sorted) {
      const collectionId = event.collectionId.toString();
      const { wmClassHash, titleHash, timestamp } = event;
      const layoutId = event.layoutId.toString();

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
      if (entries.length > MAX_LAYOUTS_PER_WM_CLASS) {
        entries.length = MAX_LAYOUTS_PER_WM_CLASS;
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

  private hashString(input: string): string {
    const checksum = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, input, -1);
    if (!checksum) {
      throw new Error(`Failed to compute checksum for: ${input}`);
    }
    return checksum.substring(0, 16);
  }
}
