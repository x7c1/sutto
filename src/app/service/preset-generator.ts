import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import {
  BASE_LAYOUT_GROUPS,
  STANDARD_LAYOUT_GROUP_NAMES,
  WIDE_LAYOUT_GROUP_NAMES,
} from '../config/base-layout-groups.js';
import { MONITORS_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from '../repository/extension-path.js';
import { generateLayoutHash } from '../repository/layout-hash-generator.js';
import { loadPresetCollections, savePresetCollections } from '../repository/space-collection.js';
import { generateUUID } from '../repository/uuid-generator.js';
import type { Layout, LayoutGroup, Space, SpaceCollection, SpacesRow } from '../types/index.js';
import type { LayoutGroupSetting, LayoutSetting } from '../types/layout-setting.js';

// Use console.log for compatibility with both extension and preferences contexts
const log = (message: string): void => console.log(message);

export type MonitorType = 'wide' | 'standard';

/**
 * Get the preset name for a given monitor count and type
 * Examples: "1 Monitor - Standard", "1 Monitor - Wide", "2 Monitors - Standard"
 */
function getPresetName(monitorCount: number, monitorType: MonitorType): string {
  const suffix = monitorCount === 1 ? 'Monitor' : 'Monitors';
  const typeLabel = monitorType === 'wide' ? 'Wide' : 'Standard';
  return `${monitorCount} ${suffix} - ${typeLabel}`;
}

/**
 * Convert a LayoutSetting to a Layout with generated ID and hash
 */
function createLayout(setting: LayoutSetting): Layout {
  return {
    id: generateUUID(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}

/**
 * Create a LayoutGroup from a LayoutGroupSetting
 */
function createLayoutGroup(groupSetting: LayoutGroupSetting): LayoutGroup {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map((setting) => createLayout(setting)),
  };
}

/**
 * Create a Space with the given layout group for all monitors
 */
function createSpace(layoutGroupName: string, monitorCount: number): Space {
  const layoutGroupSetting = BASE_LAYOUT_GROUPS.find((g) => g.name === layoutGroupName);
  if (!layoutGroupSetting) {
    throw new Error(`Layout group "${layoutGroupName}" not found`);
  }

  const displays: { [monitorKey: string]: LayoutGroup } = {};
  for (let i = 0; i < monitorCount; i++) {
    displays[String(i)] = createLayoutGroup(layoutGroupSetting);
  }

  return {
    id: generateUUID(),
    enabled: true,
    displays,
  };
}

/**
 * Generate rows based on monitor count and type
 * - 1 monitor: 2 spaces per row
 * - 2+ monitors: 1 space per row
 */
function generateRows(monitorCount: number, monitorType: MonitorType): SpacesRow[] {
  const layoutGroupNames =
    monitorType === 'wide' ? WIDE_LAYOUT_GROUP_NAMES : STANDARD_LAYOUT_GROUP_NAMES;

  const spacesPerRow = monitorCount === 1 ? 2 : 1;
  const rows: SpacesRow[] = [];

  for (let i = 0; i < layoutGroupNames.length; i += spacesPerRow) {
    const spaces: Space[] = [];
    for (let j = 0; j < spacesPerRow && i + j < layoutGroupNames.length; j++) {
      spaces.push(createSpace(layoutGroupNames[i + j], monitorCount));
    }
    rows.push({ spaces });
  }

  return rows;
}

/**
 * Generate a preset SpaceCollection for the given monitor count and type
 */
function generatePreset(monitorCount: number, monitorType: MonitorType): SpaceCollection {
  return {
    id: generateUUID(),
    name: getPresetName(monitorCount, monitorType),
    rows: generateRows(monitorCount, monitorType),
  };
}

/**
 * Get monitor count using Gdk (for settings context)
 * Returns 0 if unable to detect
 */
function getMonitorCountFromGdk(): number {
  try {
    const display = Gdk.Display.get_default();
    if (!display) {
      return 0;
    }

    const monitorList = display.get_monitors();
    if (!monitorList) {
      return 0;
    }

    return monitorList.get_n_items();
  } catch (e) {
    log(`[PresetGenerator] Error getting monitor count from Gdk: ${e}`);
    return 0;
  }
}

/**
 * Load monitor count from monitors.snappa.json
 * Falls back to Gdk detection if file doesn't exist (for settings context)
 */
export function loadMonitorCount(): number {
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (!file.query_exists(null)) {
    const gdkCount = getMonitorCountFromGdk();
    if (gdkCount > 0) {
      log(`[PresetGenerator] No monitor file, using Gdk count: ${gdkCount}`);
      return gdkCount;
    }
    return 0;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      return getMonitorCountFromGdk();
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const data = JSON.parse(contentsString);
    const currentEnv = data.environments.find(
      (e: { id: string; monitors: unknown[] }) => e.id === data.current
    );
    if (currentEnv && Array.isArray(currentEnv.monitors)) {
      return currentEnv.monitors.length;
    }
    return getMonitorCountFromGdk();
  } catch (e) {
    log(`[PresetGenerator] Error loading monitor count: ${e}`);
    return getMonitorCountFromGdk();
  }
}

/**
 * Check if a preset exists for the given monitor count and type
 */
export function hasPresetForMonitorCount(monitorCount: number, monitorType: MonitorType): boolean {
  const presets = loadPresetCollections();
  const presetName = getPresetName(monitorCount, monitorType);
  return presets.some((p) => p.name === presetName);
}

/**
 * Ensure presets exist for the current monitor configuration
 * Generates both standard and wide presets if they don't exist
 */
export function ensurePresetForMonitorCount(monitorCount: number): void {
  if (monitorCount <= 0) {
    log('[PresetGenerator] Invalid monitor count, skipping preset generation');
    return;
  }

  const presets = loadPresetCollections();
  const monitorTypes: MonitorType[] = ['standard', 'wide'];
  let updated = false;

  for (const monitorType of monitorTypes) {
    const presetName = getPresetName(monitorCount, monitorType);
    const existing = presets.find((p) => p.name === presetName);

    if (!existing) {
      log(`[PresetGenerator] Generating preset "${presetName}"`);
      const newPreset = generatePreset(monitorCount, monitorType);
      presets.push(newPreset);
      updated = true;
    }
  }

  if (updated) {
    savePresetCollections(presets);
  }
}

/**
 * Ensure presets exist for the current monitor count (from monitors.snappa.json)
 * Called when main panel or settings screen opens
 */
export function ensurePresetForCurrentMonitors(): void {
  const monitorCount = loadMonitorCount();
  if (monitorCount === 0) {
    log('[PresetGenerator] No monitor info available, skipping preset generation');
    return;
  }
  ensurePresetForMonitorCount(monitorCount);
}
