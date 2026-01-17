import Gio from 'gi://Gio';

import { HISTORY_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from './extension-path.js';

declare function log(message: string): void;

// Layout history with three-tier identification:
// 1. byWindowId: Session-only, most specific (volatile, not persisted)
// 2. byWmClass: Persistent, used when only one layout per app
// 3. byWmClassAndLabel: Persistent, used when multiple layouts per app
//
// Window Label: Currently uses window.get_title(), future: user-assignable labels

interface LayoutHistory {
  version: 1;
  byWindowId: {
    [windowId: number]: string; // windowId -> layoutId (volatile)
  };
  byWmClass: {
    [wmClass: string]: string[]; // wmClass -> layoutId[] (persistent)
  };
  byWmClassAndLabel: {
    [key: string]: string; // "wmClass::label" -> layoutId (persistent)
  };
}

/**
 * LayoutHistoryRepository
 *
 * Manages layout selection history persistence.
 * Handles loading, saving, and querying layout history globally.
 */
export class LayoutHistoryRepository {
  private history: LayoutHistory = {
    version: 1,
    byWindowId: {},
    byWmClass: {},
    byWmClassAndLabel: {},
  };

  private getHistoryFilePath(): string {
    return getExtensionDataPath(HISTORY_FILE_NAME);
  }

  /**
   * Get window label for identification
   * Returns window.get_title()
   * Can be extended to support user-assignable labels
   */
  private getWindowLabel(_windowId: number, title: string): string {
    return title;
  }

  /**
   * Load layout history from disk on extension enable
   */
  load(): void {
    const historyPath = this.getHistoryFilePath();
    const file = Gio.File.new_for_path(historyPath);

    if (!file.query_exists(null)) {
      log('[LayoutHistory] History file does not exist, using empty history');
      return;
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (!success) {
        log('[LayoutHistory] Failed to load history file');
        return;
      }

      const contentsString = new TextDecoder('utf-8').decode(contents);
      const loaded = JSON.parse(contentsString) as LayoutHistory;

      this.history = {
        version: 1,
        byWindowId: {}, // Volatile, start fresh
        byWmClass: loaded.byWmClass || {},
        byWmClassAndLabel: loaded.byWmClassAndLabel || {},
      };
      log('[LayoutHistory] History loaded successfully');
    } catch (e) {
      log(`[LayoutHistory] Error loading history: ${e}`);
      this.history = {
        version: 1,
        byWindowId: {},
        byWmClass: {},
        byWmClassAndLabel: {},
      };
    }
  }

  /**
   * Save layout history to disk (auto-save on change)
   * Only persists byWmClass and byWmClassAndLabel (byWindowId is volatile)
   */
  private save(): void {
    const historyPath = this.getHistoryFilePath();
    const file = Gio.File.new_for_path(historyPath);

    try {
      // Ensure directory exists
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      // Build persistent history (omit byWindowId)
      const persistentHistory = {
        version: 1,
        byWmClass: this.history.byWmClass,
        byWmClassAndLabel: this.history.byWmClassAndLabel,
      };
      const json = JSON.stringify(persistentHistory, null, 2);
      file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

      log('[LayoutHistory] History saved successfully');
    } catch (e) {
      log(`[LayoutHistory] Error saving history: ${e}`);
    }
  }

  /**
   * Record layout selection for a window
   *
   * @param windowId - Window ID (for session-only history)
   * @param wmClass - Application's WM_CLASS identifier
   * @param title - Window title (used to generate label)
   * @param layoutId - Layout UUID to record
   */
  setSelectedLayout(windowId: number, wmClass: string, title: string, layoutId: string): void {
    if (!wmClass) {
      log('[LayoutHistory] wmClass is empty, skipping history update');
      return;
    }

    // 1. Record in byWindowId (session-only, always updated)
    this.history.byWindowId[windowId] = layoutId;

    // 2. Record in byWmClass (persistent)
    const existingWmClassHistory = this.history.byWmClass[wmClass] || [];

    // If layout already at top (array[0] === layoutId): skip update
    if (existingWmClassHistory.length > 0 && existingWmClassHistory[0] === layoutId) {
      log(`[LayoutHistory] Layout ${layoutId} already at top for ${wmClass}`);
    } else {
      // Remove layoutId if it exists elsewhere in the array
      const filtered = existingWmClassHistory.filter((id) => id !== layoutId);
      // Add layoutId to the front
      this.history.byWmClass[wmClass] = [layoutId, ...filtered];
    }

    // 3. Record in byWmClassAndLabel (persistent)
    const label = this.getWindowLabel(windowId, title);
    const key = `${wmClass}::${label}`;
    this.history.byWmClassAndLabel[key] = layoutId;

    // Auto-save on change
    this.save();

    log(
      `[LayoutHistory] Recorded selection: windowId=${windowId}, wmClass=${wmClass}, label=${label} -> ${layoutId}`
    );
  }

  /**
   * Retrieve layout selection for a window
   *
   * @param windowId - Window ID
   * @param wmClass - Application's WM_CLASS identifier
   * @param title - Window title (used to generate label)
   * @returns Layout ID (UUID) of most recent selection, or null
   */
  getSelectedLayoutId(windowId: number, wmClass: string, title: string): string | null {
    if (!wmClass) {
      return null;
    }

    // 1. Try byWindowId (most specific)
    const byWindowId = this.history.byWindowId[windowId];
    if (byWindowId) {
      log(`[LayoutHistory] Found by windowId: ${windowId} -> ${byWindowId}`);
      return byWindowId;
    }

    // 2. Try byWmClass
    const byWmClass = this.history.byWmClass[wmClass];
    if (!byWmClass || byWmClass.length === 0) {
      log(`[LayoutHistory] No history for wmClass: ${wmClass}`);
      return null;
    }

    // If only one layout for this wmClass, use it
    if (byWmClass.length === 1) {
      log(`[LayoutHistory] Found single layout by wmClass: ${wmClass} -> ${byWmClass[0]}`);
      return byWmClass[0];
    }

    // 3. Multiple layouts exist for this wmClass, try byWmClassAndLabel
    const label = this.getWindowLabel(windowId, title);
    const key = `${wmClass}::${label}`;
    const byLabel = this.history.byWmClassAndLabel[key];
    if (byLabel) {
      log(`[LayoutHistory] Found by wmClass+label: ${key} -> ${byLabel}`);
      return byLabel;
    }

    log(`[LayoutHistory] Multiple layouts for ${wmClass}, but no match for label: ${label}`);
    return null;
  }
}
