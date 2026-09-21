import {
  generateLayoutHash,
  type Layout,
  type LayoutGroup,
  LayoutId,
  type Space,
  type SpaceCollection,
  SpaceId,
  type SpacesRow,
} from '../../../domain/layout/index.js';
import { parse } from '../../../domain/layout-expression/index.js';
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

/** Layout fields holding a layout expression (e.g. '1/3', '50%', '100% - 20px') */
const EXPRESSION_FIELDS = ['x', 'y', 'width', 'height'] as const;

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

  // Layout expressions are only parsed when a layout is drawn or applied, so a malformed one
  // would otherwise surface much later as a repeated exception. Reject the whole file here.
  return config.layoutGroups.every((group, index) => isValidLayoutGroupSetting(group, index));
}

// A rejected group is identified by its index while its name is unusable, and by its name
// afterwards, so that the log always points at one group of the imported file.
function isValidLayoutGroupSetting(group: unknown, groupIndex: number): boolean {
  if (typeof group !== 'object' || group === null) {
    log(`[ImportCollection] Layout Group at index ${groupIndex} is not an object`);
    return false;
  }

  const setting = group as Record<string, unknown>;

  if (typeof setting.name !== 'string' || setting.name.trim() === '') {
    log(`[ImportCollection] Layout Group at index ${groupIndex} has no "name"`);
    return false;
  }

  if (!Array.isArray(setting.layouts)) {
    log(`[ImportCollection] Layout Group "${setting.name}" has no "layouts" array`);
    return false;
  }

  const groupName = setting.name;

  return setting.layouts.every((layout, index) => isValidLayoutSetting(layout, groupName, index));
}

function isValidLayoutSetting(layout: unknown, groupName: string, layoutIndex: number): boolean {
  if (typeof layout !== 'object' || layout === null) {
    log(
      `[ImportCollection] Layout Group "${groupName}" has a layout at index ${layoutIndex} that is not an object`
    );
    return false;
  }

  const setting = layout as Record<string, unknown>;

  if (typeof setting.label !== 'string' || setting.label.trim() === '') {
    log(
      `[ImportCollection] Layout Group "${groupName}" has a layout at index ${layoutIndex} without a label`
    );
    return false;
  }

  // Labels repeat across groups (the built-in presets have several "Left Third"), so the group
  // name goes into the message as well to point at a single layout of the imported file.
  const layoutRef = `Layout Group "${groupName}" layout "${setting.label}"`;

  return EXPRESSION_FIELDS.every((field) =>
    isValidLayoutExpression(setting[field], layoutRef, field)
  );
}

function isValidLayoutExpression(value: unknown, layoutRef: string, field: string): boolean {
  if (typeof value !== 'string') {
    log(`[ImportCollection] ${layoutRef} has a non-string "${field}": ${JSON.stringify(value)}`);
    return false;
  }

  try {
    parse(value);
    return true;
  } catch (e) {
    log(`[ImportCollection] ${layoutRef} has an invalid "${field}" expression "${value}": ${e}`);
    return false;
  }
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
    id: new SpaceId(uuidGenerator.generate()),
    enabled: true,
    displays,
  };
}

function settingToLayout(setting: LayoutSetting): Layout {
  return {
    id: new LayoutId(uuidGenerator.generate()),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}
