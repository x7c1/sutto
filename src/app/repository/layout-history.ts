const Gio = imports.gi.Gio;

import { getExtensionDataPath } from './extension-path';

declare function log(message: string): void;

// Layout history: wmClass -> array of layout IDs (ordered by recency)
// Design: Use array from day 1 to enable future multi-level history
// Current implementation: Only use array[0] (most recent selection)
interface LayoutHistory {
  [wmClass: string]: string[]; // Layout IDs, array[0] is most recent
}

let currentHistory: LayoutHistory = {};

// Storage file path
const HISTORY_FILE_NAME = 'layout-history.json';

function getHistoryFilePath(): string {
  return getExtensionDataPath(HISTORY_FILE_NAME);
}

/**
 * Load layout history from disk on extension enable
 */
export function loadLayoutHistory(): void {
  const historyPath = getHistoryFilePath();
  const file = Gio.File.new_for_path(historyPath);

  if (!file.query_exists(null)) {
    log('[LayoutHistory] History file does not exist, using empty history');
    currentHistory = {};
    return;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log('[LayoutHistory] Failed to load history file');
      currentHistory = {};
      return;
    }

    const contentsString = String.fromCharCode.apply(null, contents);
    currentHistory = JSON.parse(contentsString);

    log('[LayoutHistory] History loaded successfully');
  } catch (e) {
    log(`[LayoutHistory] Error loading history: ${e}`);
    currentHistory = {};
  }
}

/**
 * Save layout history to disk (auto-save on change)
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

    // Write to file
    const json = JSON.stringify(currentHistory, null, 2);
    file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    log('[LayoutHistory] History saved successfully');
  } catch (e) {
    log(`[LayoutHistory] Error saving history: ${e}`);
  }
}

/**
 * Record layout selection for a given application
 * Phase 1: Maintains single element in array (most recent)
 * Phase 2: Can extend to multiple elements for gradient highlighting
 *
 * @param wmClass - Application's WM_CLASS identifier
 * @param layoutId - Layout UUID to record
 */
export function setSelectedLayout(wmClass: string, layoutId: string): void {
  if (!wmClass) {
    log('[LayoutHistory] wmClass is empty, skipping history update');
    return;
  }

  // Get current history for this app
  const existingHistory = currentHistory[wmClass] || [];

  // If layout already selected (array[0] === layoutId): Do nothing (no duplicate)
  if (existingHistory.length > 0 && existingHistory[0] === layoutId) {
    log(`[LayoutHistory] Layout ${layoutId} already selected for ${wmClass}, no update needed`);
    return;
  }

  // Replace array with single-element array [layoutId]
  // This maintains single element for Phase 1, enables multi-element for Phase 2
  currentHistory[wmClass] = [layoutId];

  // Auto-save on change
  saveLayoutHistory();

  log(`[LayoutHistory] Recorded selection: ${wmClass} -> ${layoutId}`);
}

/**
 * Retrieve most recent layout selection ID for a given application
 * Returns null if no history exists for this app
 *
 * @param wmClass - Application's WM_CLASS identifier
 * @returns Layout ID (UUID) of most recent selection, or null
 */
export function getSelectedLayoutId(wmClass: string): string | null {
  if (!wmClass) {
    return null;
  }

  const history = currentHistory[wmClass];
  if (!history || history.length === 0) {
    return null;
  }

  // Return most recent selection (array[0])
  return history[0];
}

/**
 * Retrieve last n layout selection IDs for gradient highlighting (future enhancement)
 * Phase 1: Not used (only single-element history)
 * Phase 2: Enable multi-level history visualization
 *
 * @param wmClass - Application's WM_CLASS identifier
 * @param depth - Number of recent selections to retrieve (default: 3)
 * @returns Array of layout IDs, most recent first
 */
export function getSelectedLayoutHistory(wmClass: string, depth = 3): string[] {
  if (!wmClass) {
    return [];
  }

  const history = currentHistory[wmClass];
  if (!history || history.length === 0) {
    return [];
  }

  // Return last n selections (most recent first)
  return history.slice(0, depth);
}
