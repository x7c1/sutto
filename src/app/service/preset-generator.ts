import Gio from 'gi://Gio';

import { BASE_LAYOUT_GROUPS } from '../config/base-layout-groups.js';
import { MONITORS_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from '../repository/extension-path.js';
import { generateLayoutHash } from '../repository/layout-hash-generator.js';
import { loadPresetCollections, savePresetCollections } from '../repository/space-collection.js';
import { generateUUID } from '../repository/uuid-generator.js';
import type { Layout, LayoutGroup, Space, SpaceCollection, SpacesRow } from '../types/index.js';
import type { LayoutGroupSetting, LayoutSetting } from '../types/layout-setting.js';

// Use console.log for compatibility with both extension and preferences contexts
const log = (message: string): void => console.log(message);

/**
 * Get the preset name for a given monitor count
 */
function getPresetName(monitorCount: number): string {
  if (monitorCount === 1) {
    return '1 Monitor';
  }
  return `${monitorCount} Monitors`;
}

/**
 * Convert a LayoutSetting to a Layout with generated ID and hash
 */
function createLayout(setting: LayoutSetting, monitorKey: string): Layout {
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
 * Create a LayoutGroup from a LayoutGroupSetting for a specific monitor
 */
function createLayoutGroup(groupSetting: LayoutGroupSetting, monitorKey: string): LayoutGroup {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map((setting) => createLayout(setting, monitorKey)),
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
    displays[String(i)] = createLayoutGroup(layoutGroupSetting, String(i));
  }

  return {
    id: generateUUID(),
    enabled: true,
    displays,
  };
}

/**
 * Generate rows based on monitor count
 * - 1 monitor: 2 spaces per row
 * - 2+ monitors: 1 space per row
 */
function generateRows(monitorCount: number): SpacesRow[] {
  const layoutGroupNames = [
    'vertical 3-split',
    'vertical 3-split wide center',
    'vertical 2-split',
    'grid 4x2',
    'full screen',
  ];

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
 * Generate a preset SpaceCollection for the given monitor count
 */
function generatePreset(monitorCount: number): SpaceCollection {
  return {
    id: generateUUID(),
    name: getPresetName(monitorCount),
    rows: generateRows(monitorCount),
  };
}

/**
 * Load monitor count from monitors.snappa.json
 * Returns 0 if file doesn't exist or is invalid
 */
export function loadMonitorCount(): number {
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (!file.query_exists(null)) {
    return 0;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      return 0;
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const monitors = JSON.parse(contentsString);

    if (Array.isArray(monitors)) {
      return monitors.length;
    }
    return 0;
  } catch (e) {
    log(`[PresetGenerator] Error loading monitor count: ${e}`);
    return 0;
  }
}

/**
 * Check if a preset exists for the given monitor count
 */
export function hasPresetForMonitorCount(monitorCount: number): boolean {
  const presets = loadPresetCollections();
  const presetName = getPresetName(monitorCount);
  return presets.some((p) => p.name === presetName);
}

/**
 * Ensure a preset exists for the current monitor configuration
 * Generates one if it doesn't exist
 * Returns the preset collection (existing or newly generated)
 */
export function ensurePresetForMonitorCount(monitorCount: number): SpaceCollection | undefined {
  if (monitorCount <= 0) {
    log('[PresetGenerator] Invalid monitor count, skipping preset generation');
    return undefined;
  }

  const presets = loadPresetCollections();
  const presetName = getPresetName(monitorCount);
  const existing = presets.find((p) => p.name === presetName);

  if (existing) {
    log(`[PresetGenerator] Preset "${presetName}" already exists`);
    return existing;
  }

  log(`[PresetGenerator] Generating preset for ${monitorCount} monitor(s)`);
  const newPreset = generatePreset(monitorCount);
  presets.push(newPreset);
  savePresetCollections(presets);

  log(`[PresetGenerator] Preset "${presetName}" generated and saved`);
  return newPreset;
}

/**
 * Ensure preset exists for the current monitor count (from monitors.snappa.json)
 * Called when main panel or settings screen opens
 */
export function ensurePresetForCurrentMonitors(): SpaceCollection | undefined {
  const monitorCount = loadMonitorCount();
  if (monitorCount === 0) {
    log('[PresetGenerator] No monitor info available, skipping preset generation');
    return undefined;
  }
  return ensurePresetForMonitorCount(monitorCount);
}
