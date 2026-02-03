import type { LayoutGroupSetting, LayoutSetting } from '../types/layout-setting.js';
import { generateLayoutHash } from './layout-hash.js';

// Re-export for backward compatibility
export type { LayoutGroupSetting, LayoutSetting };

export type MonitorType = 'wide' | 'standard';

export interface LayoutData {
  id: string;
  hash: string;
  label: string;
  position: { x: string; y: string };
  size: { width: string; height: string };
}

export interface LayoutGroupData {
  name: string;
  layouts: LayoutData[];
}

export interface SpaceData {
  id: string;
  enabled: boolean;
  displays: { [monitorKey: string]: LayoutGroupData };
}

export interface SpacesRowData {
  spaces: SpaceData[];
}

export interface SpaceCollectionData {
  id: string;
  name: string;
  rows: SpacesRowData[];
}

export interface UUIDGenerator {
  generate(): string;
}

/**
 * Get the preset name for a given monitor count and type
 * Examples: "1 Monitor - Standard", "1 Monitor - Wide", "2 Monitors - Standard"
 */
export function getPresetName(monitorCount: number, monitorType: MonitorType): string {
  const suffix = monitorCount === 1 ? 'Monitor' : 'Monitors';
  const typeLabel = monitorType === 'wide' ? 'Wide' : 'Standard';
  return `${monitorCount} ${suffix} - ${typeLabel}`;
}

/**
 * Convert a LayoutSetting to a LayoutData with generated ID and hash
 */
function createLayout(setting: LayoutSetting, uuidGenerator: UUIDGenerator): LayoutData {
  return {
    id: uuidGenerator.generate(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}

/**
 * Create a LayoutGroupData from a LayoutGroupSetting
 */
function createLayoutGroup(
  groupSetting: LayoutGroupSetting,
  uuidGenerator: UUIDGenerator
): LayoutGroupData {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map((setting) => createLayout(setting, uuidGenerator)),
  };
}

/**
 * Create a SpaceData with the given layout group for all monitors
 */
function createSpace(
  layoutGroupSetting: LayoutGroupSetting,
  monitorCount: number,
  uuidGenerator: UUIDGenerator
): SpaceData {
  const displays: { [monitorKey: string]: LayoutGroupData } = {};
  for (let i = 0; i < monitorCount; i++) {
    displays[String(i)] = createLayoutGroup(layoutGroupSetting, uuidGenerator);
  }

  return {
    id: uuidGenerator.generate(),
    enabled: true,
    displays,
  };
}

/**
 * Generate rows based on monitor count and type
 * - 1 monitor: 2 spaces per row
 * - 2+ monitors: 1 space per row
 */
function generateRows(
  monitorCount: number,
  layoutGroupNames: string[],
  allLayoutGroups: LayoutGroupSetting[],
  uuidGenerator: UUIDGenerator
): SpacesRowData[] {
  const spacesPerRow = monitorCount === 1 ? 2 : 1;
  const rows: SpacesRowData[] = [];

  for (let i = 0; i < layoutGroupNames.length; i += spacesPerRow) {
    const spaces: SpaceData[] = [];
    for (let j = 0; j < spacesPerRow && i + j < layoutGroupNames.length; j++) {
      const layoutGroupName = layoutGroupNames[i + j];
      const layoutGroupSetting = allLayoutGroups.find((g) => g.name === layoutGroupName);
      if (layoutGroupSetting) {
        spaces.push(createSpace(layoutGroupSetting, monitorCount, uuidGenerator));
      }
    }
    if (spaces.length > 0) {
      rows.push({ spaces });
    }
  }

  return rows;
}

/**
 * Generate a preset SpaceCollectionData for the given monitor count and type
 */
export function generatePreset(
  monitorCount: number,
  monitorType: MonitorType,
  layoutGroupNames: string[],
  allLayoutGroups: LayoutGroupSetting[],
  uuidGenerator: UUIDGenerator
): SpaceCollectionData {
  return {
    id: uuidGenerator.generate(),
    name: getPresetName(monitorCount, monitorType),
    rows: generateRows(monitorCount, layoutGroupNames, allLayoutGroups, uuidGenerator),
  };
}
