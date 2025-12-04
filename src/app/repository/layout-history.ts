const Gio = imports.gi.Gio;

import { getExtensionDataPath } from './extension-path';

declare function log(message: string): void;

// Layout history with three-tier identification:
// 1. byWindowId: Session-only, most specific (volatile, not persisted)
// 2. byWmClass: Persistent, used when only one layout per app
// 3. byWmClassAndLabel: Persistent, used when multiple layouts per app
//
// Window Label: Currently uses window.get_title(), future: user-assignable labels
interface LayoutHistory {
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

let currentHistory: LayoutHistory = {
  byWindowId: {},
  byWmClass: {},
  byWmClassAndLabel: {},
};

// Storage file path
const HISTORY_FILE_NAME = 'layout-history.json';

function getHistoryFilePath(): string {
  return getExtensionDataPath(HISTORY_FILE_NAME);
}

/**
 * Get window label for identification
 * Phase 1: Returns window.get_title()
 * Phase 2: Will support user-assignable labels
 */
function getWindowLabel(_windowId: number, title: string): string {
  // Future: Look up user-assigned label for this _windowId
  // For now, just return the title
  return title;
}

/**
 * Load layout history from disk on extension enable
 * Supports migration from old format (flat wmClass -> layoutId[])
 */
export function loadLayoutHistory(): void {
  const historyPath = getHistoryFilePath();
  const file = Gio.File.new_for_path(historyPath);

  if (!file.query_exists(null)) {
    log('[LayoutHistory] History file does not exist, using empty history');
    currentHistory = {
      byWindowId: {},
      byWmClass: {},
      byWmClassAndLabel: {},
    };
    return;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log('[LayoutHistory] Failed to load history file');
      currentHistory = {
        byWindowId: {},
        byWmClass: {},
        byWmClassAndLabel: {},
      };
      return;
    }

    const contentsString = String.fromCharCode.apply(null, contents);
    const loaded = JSON.parse(contentsString);

    // Check if this is the new format or old format
    if (loaded.byWmClass !== undefined) {
      // New format
      currentHistory = {
        byWindowId: {}, // Always start fresh (volatile)
        byWmClass: loaded.byWmClass || {},
        byWmClassAndLabel: loaded.byWmClassAndLabel || {},
      };
      log('[LayoutHistory] History loaded successfully (new format)');
    } else {
      // Old format: { [wmClass: string]: string[] }
      // Migrate to new format
      currentHistory = {
        byWindowId: {},
        byWmClass: loaded,
        byWmClassAndLabel: {},
      };
      log('[LayoutHistory] History migrated from old format');
      // Save in new format
      saveLayoutHistory();
    }
  } catch (e) {
    log(`[LayoutHistory] Error loading history: ${e}`);
    currentHistory = {
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
export function saveLayoutHistory(): void {
  const historyPath = getHistoryFilePath();
  const file = Gio.File.new_for_path(historyPath);

  try {
    // Ensure directory exists
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }

    // Write to file (omit byWindowId, which is session-only)
    const persistentHistory = {
      byWmClass: currentHistory.byWmClass,
      byWmClassAndLabel: currentHistory.byWmClassAndLabel,
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
 * Records in all three tiers: byWindowId, byWmClass, byWmClassAndLabel
 *
 * @param windowId - Window ID (for session-only history)
 * @param wmClass - Application's WM_CLASS identifier
 * @param title - Window title (used to generate label)
 * @param layoutId - Layout UUID to record
 */
export function setSelectedLayout(
  windowId: number,
  wmClass: string,
  title: string,
  layoutId: string
): void {
  if (!wmClass) {
    log('[LayoutHistory] wmClass is empty, skipping history update');
    return;
  }

  // 1. Record in byWindowId (session-only, always updated)
  currentHistory.byWindowId[windowId] = layoutId;

  // 2. Record in byWmClass (persistent)
  const existingWmClassHistory = currentHistory.byWmClass[wmClass] || [];

  // If layout already at top (array[0] === layoutId): skip update
  if (existingWmClassHistory.length > 0 && existingWmClassHistory[0] === layoutId) {
    log(`[LayoutHistory] Layout ${layoutId} already at top for ${wmClass}`);
  } else {
    // Remove layoutId if it exists elsewhere in the array
    const filtered = existingWmClassHistory.filter((id) => id !== layoutId);
    // Add layoutId to the front
    currentHistory.byWmClass[wmClass] = [layoutId, ...filtered];
  }

  // 3. Record in byWmClassAndLabel (persistent)
  const label = getWindowLabel(windowId, title);
  const key = `${wmClass}::${label}`;
  currentHistory.byWmClassAndLabel[key] = layoutId;

  // Auto-save on change
  saveLayoutHistory();

  log(
    `[LayoutHistory] Recorded selection: windowId=${windowId}, wmClass=${wmClass}, label=${label} -> ${layoutId}`
  );
}

/**
 * Retrieve most recent layout selection ID using three-tier lookup
 * Lookup order:
 * 1. byWindowId (most specific, session-only)
 * 2. byWmClass (if only one layout for this app)
 * 3. byWmClassAndLabel (if multiple layouts for this app)
 *
 * @param windowId - Window ID
 * @param wmClass - Application's WM_CLASS identifier
 * @param title - Window title (used to generate label)
 * @returns Layout ID (UUID) of most recent selection, or null
 */
export function getSelectedLayoutId(
  windowId: number,
  wmClass: string,
  title: string
): string | null {
  if (!wmClass) {
    return null;
  }

  // 1. Try byWindowId (most specific)
  const byWindowId = currentHistory.byWindowId[windowId];
  if (byWindowId) {
    log(`[LayoutHistory] Found by windowId: ${windowId} -> ${byWindowId}`);
    return byWindowId;
  }

  // 2. Try byWmClass
  const byWmClass = currentHistory.byWmClass[wmClass];
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
  const label = getWindowLabel(windowId, title);
  const key = `${wmClass}::${label}`;
  const byLabel = currentHistory.byWmClassAndLabel[key];
  if (byLabel) {
    log(`[LayoutHistory] Found by wmClass+label: ${key} -> ${byLabel}`);
    return byLabel;
  }

  log(`[LayoutHistory] Multiple layouts for ${wmClass}, but no match for label: ${label}`);
  return null;
}
