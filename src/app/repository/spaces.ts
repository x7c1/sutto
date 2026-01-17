import Gio from 'gi://Gio';

import { SPACES_FILE_NAME } from '../constants.js';
import type { Layout, LayoutGroup, Space, SpacesRow } from '../types/index.js';
import type {
  LayoutConfiguration,
  LayoutGroupSetting,
  LayoutSetting,
  SpaceSetting,
  SpacesRowSetting,
} from '../types/layout-setting.js';
import { getExtensionDataPath } from './extension-path.js';
import { generateLayoutHash } from './layout-hash-generator.js';

declare function log(message: string): void;

function getSpacesFilePath(): string {
  return getExtensionDataPath(SPACES_FILE_NAME);
}

/**
 * Generates a simple UUID v4-like string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID(): string {
  const chars = '0123456789abcdef';
  let uuid = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      // Variant bits: 10xx (8, 9, a, or b)
      const randomIndex = Math.floor(Math.random() * 4);
      uuid += chars[8 + randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * 16);
      uuid += chars[randomIndex];
    }
  }

  return uuid;
}

/**
 * Converts a LayoutSetting to a Layout by adding ID and hash
 */
function settingToLayout(setting: LayoutSetting, monitorKey: string): Layout {
  return {
    id: generateUUID(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    monitorKey,
    x: setting.x,
    y: setting.y,
    width: setting.width,
    height: setting.height,
  };
}

/**
 * Converts LayoutGroupSetting to LayoutGroup
 */
function settingToLayoutGroup(
  groupSetting: LayoutGroupSetting,
  monitorKey: string = '0'
): LayoutGroup {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map((setting) => settingToLayout(setting, monitorKey)),
  };
}

/**
 * Public helper: Convert layout group settings to layout groups
 * Used for test layouts in debug mode
 */
export function convertLayoutGroupSettings(groupSettings: LayoutGroupSetting[]): LayoutGroup[] {
  return groupSettings.map((setting) => settingToLayoutGroup(setting, '0'));
}

// ============================================================================
// Multi-monitor support functions
// ============================================================================

/**
 * Convert SpaceSetting to Space (runtime type)
 * Expands Layout Group names to full LayoutGroup objects with unique IDs
 */
function settingToSpace(
  spaceSetting: SpaceSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): Space {
  const displays: { [monitorKey: string]: LayoutGroup } = {};

  // For each monitor in the Space
  for (const [monitorKey, layoutGroupName] of Object.entries(spaceSetting.displays)) {
    // Find the Layout Group definition by name
    const layoutGroupSetting = layoutGroupSettings.find((g) => g.name === layoutGroupName);

    if (!layoutGroupSetting) {
      log(
        `[SpacesRepository] Warning: Layout Group "${layoutGroupName}" not found for monitor ${monitorKey}`
      );
      continue;
    }

    // Create a new LayoutGroup instance with unique IDs for this monitor
    // Each monitor gets its own LayoutGroup instance with separate IDs
    const layoutGroup: LayoutGroup = {
      name: layoutGroupSetting.name,
      layouts: layoutGroupSetting.layouts.map((setting) => settingToLayout(setting, monitorKey)),
    };

    displays[monitorKey] = layoutGroup;
  }

  return {
    id: generateUUID(),
    enabled: true,
    displays,
  };
}

/**
 * Convert SpacesRowSetting to SpacesRow (runtime type)
 */
function settingToSpacesRow(
  rowSetting: SpacesRowSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): SpacesRow {
  return {
    spaces: rowSetting.spaces.map((s) => settingToSpace(s, layoutGroupSettings)),
  };
}

/**
 * Convert LayoutConfiguration to SpacesRow[] (runtime type)
 * Expands Layout Group references into full LayoutGroup objects with unique IDs
 */
function configurationToSpacesRows(config: LayoutConfiguration): SpacesRow[] {
  return config.rows.map((rowSetting) => settingToSpacesRow(rowSetting, config.layoutGroups));
}

/**
 * Import layout configuration and convert to runtime format
 *
 */
export function importLayoutConfiguration(config: LayoutConfiguration): void {
  try {
    const rows = configurationToSpacesRows(config);
    saveSpacesRows(rows);
    log('[LayoutsRepository] Layout configuration imported successfully');
  } catch (e) {
    log(`[SpacesRepository] Error importing layout configuration: ${e}`);
  }
}

/**
 * Validate that data is in the SpacesRow[] format
 * Returns true if valid, false if old format or invalid
 */
function isValidSpacesRowsData(data: unknown): data is SpacesRow[] {
  if (!Array.isArray(data)) {
    return false;
  }

  // Check if all rows have spaces
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (typeof row !== 'object' || row === null) {
      return false;
    }

    // Check for required fields
    if (!('spaces' in row)) {
      return false;
    }

    if (!Array.isArray(row.spaces)) {
      return false;
    }
  }

  return true;
}

/**
 * Load layouts as spaces rows (returns SpacesRow[] with expanded Spaces)
 *
 */
export function loadLayoutsAsSpacesRows(): SpacesRow[] {
  const layoutsPath = getSpacesFilePath();
  const file = Gio.File.new_for_path(layoutsPath);

  if (!file.query_exists(null)) {
    log('[LayoutsRepository] Layouts file does not exist, returning empty array');
    return [];
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log('[LayoutsRepository] Failed to load layouts file');
      return [];
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const data: unknown = JSON.parse(contentsString);

    // Validate data format
    if (!isValidSpacesRowsData(data)) {
      log('[LayoutsRepository] WARNING: Invalid or old format data detected in layouts file');
      log('[LayoutsRepository] Deleting old format file and returning empty array');
      // Delete the old format file
      try {
        file.delete(null);
        log('[LayoutsRepository] Old format file deleted successfully');
      } catch (deleteError) {
        log(`[SpacesRepository] Failed to delete old format file: ${deleteError}`);
      }
      return [];
    }

    log('[LayoutsRepository] Spaces rows loaded successfully');
    return data;
  } catch (e) {
    log(`[SpacesRepository] Error loading spaces rows: ${e}`);
    return [];
  }
}

/**
 * Save SpacesRow[] to disk (runtime format with Spaces)
 *
 */
function saveSpacesRows(rows: SpacesRow[]): void {
  const layoutsPath = getSpacesFilePath();
  const file = Gio.File.new_for_path(layoutsPath);

  try {
    // Ensure directory exists
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }

    // Write to file
    const json = JSON.stringify(rows, null, 2);
    file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    log('[SpacesRepository] Spaces rows saved successfully');
  } catch (e) {
    log(`[SpacesRepository] Error saving spaces rows: ${e}`);
  }
}

/**
 * Set the enabled state of a Space by its ID
 * Loads all SpacesRows, finds the Space, updates its enabled property, and saves back
 */
export function setSpaceEnabled(spaceId: string, enabled: boolean): void {
  const rows = loadLayoutsAsSpacesRows();

  let found = false;
  for (const row of rows) {
    for (const space of row.spaces) {
      if (space.id === spaceId) {
        space.enabled = enabled;
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    log(`[SpacesRepository] Warning: Space with id "${spaceId}" not found`);
    return;
  }

  saveSpacesRows(rows);
  log(`[SpacesRepository] Space "${spaceId}" enabled state set to ${enabled}`);
}
