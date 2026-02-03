export { CollectionId, InvalidCollectionIdError } from './collection-id.js';
export { generateLayoutHash } from './layout-hash.js';
export { InvalidLayoutIdError, LayoutId } from './layout-id.js';
export {
  BASE_LAYOUT_GROUPS,
  STANDARD_LAYOUT_GROUP_NAMES,
  WIDE_LAYOUT_GROUP_NAMES,
} from './preset-config.js';
export type {
  LayoutData as PresetLayoutData,
  LayoutGroupData as PresetLayoutGroupData,
  LayoutGroupSetting,
  LayoutSetting,
  MonitorType,
  SpaceCollectionData as PresetSpaceCollectionData,
  SpaceData as PresetSpaceData,
  SpacesRowData as PresetSpacesRowData,
  UUIDGenerator,
} from './preset-generator.js';
export { generatePreset, getPresetName } from './preset-generator.js';
export { InvalidSpaceIdError, SpaceId } from './space-id.js';
