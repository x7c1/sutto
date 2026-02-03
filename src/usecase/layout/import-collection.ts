import {
  CollectionId,
  generateLayoutHash,
  type LayoutData,
  type LayoutGroupData,
  type SpaceCollectionData,
  type SpaceData,
  type SpacesRowData,
} from '../../domain/layout/index.js';
import { generateUUID } from '../../libs/uuid/index.js';
import type { SpaceCollectionRepository } from './space-collection-repository.js';

declare function log(message: string): void;

// Configuration types for import
export interface LayoutSetting {
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
}

export interface LayoutGroupSetting {
  name: string;
  layouts: LayoutSetting[];
}

export interface SpaceSetting {
  displays: {
    [monitorKey: string]: string;
  };
}

export interface SpacesRowSetting {
  spaces: SpaceSetting[];
}

export interface LayoutConfiguration {
  name: string;
  layoutGroups: LayoutGroupSetting[];
  rows: SpacesRowSetting[];
}

/**
 * Validate that the input is a valid LayoutConfiguration with required name
 */
function isValidLayoutConfiguration(data: unknown): data is LayoutConfiguration {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const config = data as Record<string, unknown>;

  // Check required name field
  if (typeof config.name !== 'string' || config.name.trim() === '') {
    return false;
  }

  // Check layoutGroups
  if (!Array.isArray(config.layoutGroups)) {
    return false;
  }

  // Check rows
  if (!Array.isArray(config.rows)) {
    return false;
  }

  return true;
}

/**
 * Convert a LayoutSetting to a LayoutData with generated ID and hash
 */
function settingToLayout(setting: LayoutSetting): LayoutData {
  return {
    id: generateUUID(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}

/**
 * Convert SpaceSetting to SpaceData
 */
function settingToSpace(
  spaceSetting: SpaceSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): SpaceData {
  const displays: { [monitorKey: string]: LayoutGroupData } = {};

  for (const [monitorKey, layoutGroupName] of Object.entries(spaceSetting.displays)) {
    const layoutGroupSetting = layoutGroupSettings.find((g) => g.name === layoutGroupName);

    if (!layoutGroupSetting) {
      log(
        `[ImportCollection] Warning: Layout Group "${layoutGroupName}" not found for monitor ${monitorKey}`
      );
      continue;
    }

    const layoutGroup: LayoutGroupData = {
      name: layoutGroupSetting.name,
      layouts: layoutGroupSetting.layouts.map((setting) => settingToLayout(setting)),
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
 * Convert SpacesRowSetting to SpacesRowData
 */
function settingToSpacesRow(
  rowSetting: SpacesRowSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): SpacesRowData {
  return {
    spaces: rowSetting.spaces.map((s) => settingToSpace(s, layoutGroupSettings)),
  };
}

/**
 * Convert LayoutConfiguration to SpacesRowData[]
 */
function configurationToSpacesRows(config: LayoutConfiguration): SpacesRowData[] {
  return config.rows.map((rowSetting) => settingToSpacesRow(rowSetting, config.layoutGroups));
}

/**
 * Import a LayoutConfiguration and create a custom SpaceCollection
 * Returns the created SpaceCollection, or null if validation failed
 */
export function importLayoutConfiguration(
  repository: SpaceCollectionRepository,
  data: unknown
): SpaceCollectionData | null {
  if (!isValidLayoutConfiguration(data)) {
    log(
      '[ImportCollection] Invalid LayoutConfiguration: missing required fields or invalid format'
    );
    return null;
  }

  try {
    const rows = configurationToSpacesRows(data);
    const collection = repository.addCustomCollection({
      name: data.name,
      rows,
    });

    log(`[ImportCollection] Successfully imported "${data.name}" as custom SpaceCollection`);
    return collection;
  } catch (e) {
    log(`[ImportCollection] Error importing layout configuration: ${e}`);
    return null;
  }
}

/**
 * Import a LayoutConfiguration from JSON string
 * Returns the created SpaceCollection, or null if parsing or validation failed
 */
export function importLayoutConfigurationFromJson(
  repository: SpaceCollectionRepository,
  jsonString: string
): SpaceCollectionData | null {
  try {
    const data = JSON.parse(jsonString);
    return importLayoutConfiguration(repository, data);
  } catch (e) {
    log(`[ImportCollection] Error parsing JSON: ${e}`);
    return null;
  }
}

/**
 * Delete a custom SpaceCollection by ID
 * Returns true if deleted, false if not found or is a preset
 */
export function deleteCustomCollection(
  repository: SpaceCollectionRepository,
  collectionId: string
): boolean {
  const id = CollectionId.tryCreate(collectionId);
  if (!id) {
    return false;
  }
  return repository.deleteCustomCollection(id);
}
