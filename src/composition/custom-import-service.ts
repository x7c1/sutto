/**
 * Custom Import Service
 *
 * Services for importing and deleting custom layout configurations.
 */

import { generateLayoutHash } from '../domain/layout/index.js';
import type {
  Layout,
  LayoutConfiguration,
  LayoutGroup,
  LayoutGroupSetting,
  LayoutSetting,
  Space,
  SpaceSetting,
  SpacesRow,
  SpacesRowSetting,
} from '../domain/types/index.js';
import { generateUUID } from '../libs/uuid/index.js';
import type { SpaceCollectionData } from '../usecase/layout/index.js';
import { getSpaceCollectionUseCase } from './use-case-factory.js';

declare function log(message: string): void;

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
 * Convert a LayoutSetting to a Layout with generated ID and hash
 */
function settingToLayout(setting: LayoutSetting): Layout {
  return {
    id: generateUUID(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}

/**
 * Convert SpaceSetting to Space (runtime type)
 */
function settingToSpace(
  spaceSetting: SpaceSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): Space {
  const displays: { [monitorKey: string]: LayoutGroup } = {};

  for (const [monitorKey, layoutGroupName] of Object.entries(spaceSetting.displays)) {
    const layoutGroupSetting = layoutGroupSettings.find((g) => g.name === layoutGroupName);

    if (!layoutGroupSetting) {
      log(
        `[CustomImport] Warning: Layout Group "${layoutGroupName}" not found for monitor ${monitorKey}`
      );
      continue;
    }

    const layoutGroup: LayoutGroup = {
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
 * Convert LayoutConfiguration to SpacesRow[]
 */
function configurationToSpacesRows(config: LayoutConfiguration): SpacesRow[] {
  return config.rows.map((rowSetting) => settingToSpacesRow(rowSetting, config.layoutGroups));
}

/**
 * Import a LayoutConfiguration JSON and create a custom SpaceCollection
 * Returns the created SpaceCollection, or null if validation failed
 */
export function importLayoutConfiguration(data: unknown): SpaceCollectionData | null {
  if (!isValidLayoutConfiguration(data)) {
    log('[CustomImport] Invalid LayoutConfiguration: missing required fields or invalid format');
    return null;
  }

  try {
    const rows = configurationToSpacesRows(data);
    const collection = getSpaceCollectionUseCase().addCustomCollection({
      name: data.name,
      rows,
    });

    log(`[CustomImport] Successfully imported "${data.name}" as custom SpaceCollection`);
    return collection;
  } catch (e) {
    log(`[CustomImport] Error importing layout configuration: ${e}`);
    return null;
  }
}

/**
 * Import a LayoutConfiguration from JSON string
 * Returns the created SpaceCollection, or null if parsing or validation failed
 */
export function importLayoutConfigurationFromJson(jsonString: string): SpaceCollectionData | null {
  try {
    const data = JSON.parse(jsonString);
    return importLayoutConfiguration(data);
  } catch (e) {
    log(`[CustomImport] Error parsing JSON: ${e}`);
    return null;
  }
}

/**
 * Delete a custom SpaceCollection by ID
 * Returns true if deleted, false if not found or is a preset
 */
export function deleteCustomCollection(collectionId: string): boolean {
  return getSpaceCollectionUseCase().deleteCustomCollection(collectionId);
}
