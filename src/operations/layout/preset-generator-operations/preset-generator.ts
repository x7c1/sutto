import { generateLayoutHash } from '../../../domain/layout/layout-hash.js';
import type {
  Layout,
  LayoutGroup,
  Space,
  SpaceCollection,
  SpacesRow,
} from '../../../domain/layout/types.js';
import type { LayoutGroupSetting, LayoutSetting } from '../../../domain/settings/index.js';
import type { UUIDGenerator } from '../../../libs/uuid/index.js';

export type MonitorType = 'wide' | 'standard';

export function generatePreset(
  monitorCount: number,
  monitorType: MonitorType,
  layoutGroupNames: string[],
  allLayoutGroups: LayoutGroupSetting[],
  uuidGenerator: UUIDGenerator
): SpaceCollection {
  return {
    id: uuidGenerator.generate(),
    name: getPresetName(monitorCount, monitorType),
    rows: generateRows(monitorCount, layoutGroupNames, allLayoutGroups, uuidGenerator),
  };
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

function generateRows(
  monitorCount: number,
  layoutGroupNames: string[],
  allLayoutGroups: LayoutGroupSetting[],
  uuidGenerator: UUIDGenerator
): SpacesRow[] {
  const spacesPerRow = monitorCount === 1 ? 2 : 1;
  const rows: SpacesRow[] = [];

  for (let i = 0; i < layoutGroupNames.length; i += spacesPerRow) {
    const spaces: Space[] = [];
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

function createSpace(
  layoutGroupSetting: LayoutGroupSetting,
  monitorCount: number,
  uuidGenerator: UUIDGenerator
): Space {
  const displays: { [monitorKey: string]: LayoutGroup } = {};
  for (let i = 0; i < monitorCount; i++) {
    displays[String(i)] = createLayoutGroup(layoutGroupSetting, uuidGenerator);
  }

  return {
    id: uuidGenerator.generate(),
    enabled: true,
    displays,
  };
}

function createLayoutGroup(
  groupSetting: LayoutGroupSetting,
  uuidGenerator: UUIDGenerator
): LayoutGroup {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map((setting) => createLayout(setting, uuidGenerator)),
  };
}

function createLayout(setting: LayoutSetting, uuidGenerator: UUIDGenerator): Layout {
  return {
    id: uuidGenerator.generate(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    position: { x: setting.x, y: setting.y },
    size: { width: setting.width, height: setting.height },
  };
}
