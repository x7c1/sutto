import {
  generateLayoutHash,
  type Layout,
  type LayoutGroup,
  type Space,
  type SpaceCollection,
  type SpacesRow,
} from '../../../domain/layout/index.js';
import type {
  LayoutConfiguration,
  LayoutGroupSetting,
  LayoutSetting,
  SpaceSetting,
  SpacesRowSetting,
} from '../../../domain/settings/index.js';
import { uuidGenerator } from '../../../libs/uuid/index.js';
import type { SpaceCollectionRepository } from '../space-collection-repository.js';

declare function log(message: string): void;

/**
 * Import a LayoutConfiguration from JSON string
 * Returns the created SpaceCollection, or null if parsing or validation failed
 */
export function importLayoutConfigurationFromJson(
  repository: SpaceCollectionRepository,
  jsonString: string
): SpaceCollection | null {
  try {
    const data = JSON.parse(jsonString);
    return importLayoutConfiguration(repository, data);
  } catch (e) {
    log(`[ImportCollection] Error parsing JSON: ${e}`);
    return null;
  }
}

function importLayoutConfiguration(
  repository: SpaceCollectionRepository,
  data: unknown
): SpaceCollection | null {
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

function isValidLayoutConfiguration(data: unknown): data is LayoutConfiguration {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const config = data as Record<string, unknown>;

  if (typeof config.name !== 'string' || config.name.trim() === '') {
    return false;
  }

  if (!Array.isArray(config.layoutGroups)) {
    return false;
  }

  if (!Array.isArray(config.rows)) {
    return false;
  }

  return true;
}

function configurationToSpacesRows(config: LayoutConfiguration): SpacesRow[] {
  return config.rows.map((rowSetting) => settingToSpacesRow(rowSetting, config.layoutGroups));
}

function settingToSpacesRow(
  rowSetting: SpacesRowSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): SpacesRow {
  return {
    spaces: rowSetting.spaces.map((s) => settingToSpace(s, layoutGroupSettings)),
  };
}

function settingToSpace(
  spaceSetting: SpaceSetting,
  layoutGroupSettings: LayoutGroupSetting[]
): Space {
  const displays: { [monitorKey: string]: LayoutGroup } = {};

  for (const [monitorKey, layoutGroupName] of Object.entries(spaceSetting.displays)) {
    const layoutGroupSetting = layoutGroupSettings.find((g) => g.name === layoutGroupName);

    if (!layoutGroupSetting) {
      log(
        `[ImportCollection] Warning: Layout Group "${layoutGroupName}" not found for monitor ${monitorKey}`
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
    id: uuidGenerator.generate(),
    enabled: true,
    displays,
  };
}

function settingToLayout(setting: LayoutSetting): Layout {
  return {
    id: uuidGenerator.generate(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}
