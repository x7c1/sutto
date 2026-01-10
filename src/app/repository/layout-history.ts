import Gio from 'gi://Gio';

import { getExtensionDataPath } from './extension-path.js';

declare function log(message: string): void;

// Layout history with three-tier identification:
// 1. byWindowId: Session-only, most specific (volatile, not persisted)
// 2. byWmClass: Persistent, used when only one layout per app
// 3. byWmClassAndLabel: Persistent, used when multiple layouts per app
//
// Window Label: Currently uses window.get_title(), future: user-assignable labels

// Version 2 format
interface PerMonitorHistory {
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

interface LayoutHistoryV2 {
  version: 2;
  byMonitor: {
    [monitorKey: string]: PerMonitorHistory;
  };
}

// Storage file path
const HISTORY_FILE_NAME = 'layout-history.json';

/**
 * LayoutHistoryRepository
 *
 * Manages layout selection history persistence.
 * Handles loading, saving, and querying layout history per monitor.
 */
export class LayoutHistoryRepository {
  private history: LayoutHistoryV2 = {
    version: 2,
    byMonitor: {},
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
   * Get or create monitor history entry
   * Helper for version 2 per-monitor history
   */
  private getMonitorHistory(monitorKey: string): PerMonitorHistory {
    if (!this.history.byMonitor[monitorKey]) {
      this.history.byMonitor[monitorKey] = {
        byWindowId: {},
        byWmClass: {},
        byWmClassAndLabel: {},
      };
    }
    return this.history.byMonitor[monitorKey];
  }

  /**
   * Load layout history from disk on extension enable
   * Supports migration from old format (flat wmClass -> layoutId[])
   */
  load(): void {
    const historyPath = this.getHistoryFilePath();
    const file = Gio.File.new_for_path(historyPath);

    if (!file.query_exists(null)) {
      log('[LayoutHistory] History file does not exist, using empty history');
      this.history = {
        version: 2,
        byMonitor: {},
      };
      return;
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (!success) {
        log('[LayoutHistory] Failed to load history file');
        this.history = {
          version: 2,
          byMonitor: {},
        };
        return;
      }

      const contentsString = new TextDecoder('utf-8').decode(contents);
      const loaded = JSON.parse(contentsString);

      // Check version and migrate if necessary
      if (loaded.version === 2) {
        // Version 2 format (per-monitor history)
        this.history = {
          version: 2,
          byMonitor: loaded.byMonitor || {},
        };
        // Reset volatile session-only history for all monitors
        for (const monitorKey in this.history.byMonitor) {
          this.history.byMonitor[monitorKey].byWindowId = {};
        }
        log('[LayoutHistory] History loaded successfully (version 2)');
      } else if (loaded.byWmClass !== undefined) {
        // Version 1 format - migrate to monitor "0"
        log('[LayoutHistory] Migrating from version 1 to version 2');
        this.history = {
          version: 2,
          byMonitor: {
            '0': {
              byWindowId: {}, // Volatile, start fresh
              byWmClass: loaded.byWmClass || {},
              byWmClassAndLabel: loaded.byWmClassAndLabel || {},
            },
          },
        };
        log('[LayoutHistory] Migration complete: all history moved to monitor "0"');
        // Save in new format
        this.save();
      } else {
        // Very old format: { [wmClass: string]: string[] }
        // Migrate to version 2 monitor "0"
        log('[LayoutHistory] Migrating from very old format to version 2');
        this.history = {
          version: 2,
          byMonitor: {
            '0': {
              byWindowId: {},
              byWmClass: loaded,
              byWmClassAndLabel: {},
            },
          },
        };
        log('[LayoutHistory] Migration complete');
        this.save();
      }
    } catch (e) {
      log(`[LayoutHistory] Error loading history: ${e}`);
      this.history = {
        version: 2,
        byMonitor: {},
      };
    }
  }

  /**
   * Save layout history to disk (auto-save on change)
   * Saves version 2 format with per-monitor history
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

      // Build persistent history (omit byWindowId for all monitors)
      const persistentByMonitor: { [key: string]: Partial<PerMonitorHistory> } = {};
      for (const monitorKey in this.history.byMonitor) {
        persistentByMonitor[monitorKey] = {
          byWmClass: this.history.byMonitor[monitorKey].byWmClass,
          byWmClassAndLabel: this.history.byMonitor[monitorKey].byWmClassAndLabel,
        };
      }

      const persistentHistory = {
        version: 2,
        byMonitor: persistentByMonitor,
      };
      const json = JSON.stringify(persistentHistory, null, 2);
      file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

      log('[LayoutHistory] History saved successfully (version 2)');
    } catch (e) {
      log(`[LayoutHistory] Error saving history: ${e}`);
    }
  }

  /**
   * Record layout selection for a window on a specific monitor
   *
   * @param monitorKey - Monitor key ("0", "1", "2"...)
   * @param windowId - Window ID (for session-only history)
   * @param wmClass - Application's WM_CLASS identifier
   * @param title - Window title (used to generate label)
   * @param layoutId - Layout UUID to record
   */
  setSelectedLayoutForMonitor(
    monitorKey: string,
    windowId: number,
    wmClass: string,
    title: string,
    layoutId: string
  ): void {
    if (!wmClass) {
      log('[LayoutHistory] wmClass is empty, skipping history update');
      return;
    }

    const monitorHistory = this.getMonitorHistory(monitorKey);

    // 1. Record in byWindowId (session-only, always updated)
    monitorHistory.byWindowId[windowId] = layoutId;

    // 2. Record in byWmClass (persistent)
    const existingWmClassHistory = monitorHistory.byWmClass[wmClass] || [];

    // If layout already at top (array[0] === layoutId): skip update
    if (existingWmClassHistory.length > 0 && existingWmClassHistory[0] === layoutId) {
      log(
        `[LayoutHistory] Layout ${layoutId} already at top for ${wmClass} on monitor ${monitorKey}`
      );
    } else {
      // Remove layoutId if it exists elsewhere in the array
      const filtered = existingWmClassHistory.filter((id) => id !== layoutId);
      // Add layoutId to the front
      monitorHistory.byWmClass[wmClass] = [layoutId, ...filtered];
    }

    // 3. Record in byWmClassAndLabel (persistent)
    const label = this.getWindowLabel(windowId, title);
    const key = `${wmClass}::${label}`;
    monitorHistory.byWmClassAndLabel[key] = layoutId;

    // Auto-save on change
    this.save();

    log(
      `[LayoutHistory] Recorded selection for monitor ${monitorKey}: windowId=${windowId}, wmClass=${wmClass}, label=${label} -> ${layoutId}`
    );
  }

  /**
   * Retrieve layout selection for a window on a specific monitor
   *
   * @param monitorKey - Monitor key ("0", "1", "2"...)
   * @param windowId - Window ID
   * @param wmClass - Application's WM_CLASS identifier
   * @param title - Window title (used to generate label)
   * @returns Layout ID (UUID) of most recent selection, or null
   */
  getSelectedLayoutIdForMonitor(
    monitorKey: string,
    windowId: number,
    wmClass: string,
    title: string
  ): string | null {
    if (!wmClass) {
      return null;
    }

    const monitorHistory = this.getMonitorHistory(monitorKey);

    // 1. Try byWindowId (most specific)
    const byWindowId = monitorHistory.byWindowId[windowId];
    if (byWindowId) {
      log(
        `[LayoutHistory] Found by windowId on monitor ${monitorKey}: ${windowId} -> ${byWindowId}`
      );
      return byWindowId;
    }

    // 2. Try byWmClass
    const byWmClass = monitorHistory.byWmClass[wmClass];
    if (!byWmClass || byWmClass.length === 0) {
      log(`[LayoutHistory] No history for wmClass: ${wmClass} on monitor ${monitorKey}`);
      return null;
    }

    // If only one layout for this wmClass, use it
    if (byWmClass.length === 1) {
      log(
        `[LayoutHistory] Found single layout by wmClass on monitor ${monitorKey}: ${wmClass} -> ${byWmClass[0]}`
      );
      return byWmClass[0];
    }

    // 3. Multiple layouts exist for this wmClass, try byWmClassAndLabel
    const label = this.getWindowLabel(windowId, title);
    const key = `${wmClass}::${label}`;
    const byLabel = monitorHistory.byWmClassAndLabel[key];
    if (byLabel) {
      log(`[LayoutHistory] Found by wmClass+label on monitor ${monitorKey}: ${key} -> ${byLabel}`);
      return byLabel;
    }

    log(
      `[LayoutHistory] Multiple layouts for ${wmClass} on monitor ${monitorKey}, but no match for label: ${label}`
    );
    return null;
  }
}
