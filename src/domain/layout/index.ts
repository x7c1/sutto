export { CollectionId, InvalidCollectionIdError } from './collection-id.js';
export { generateLayoutHash } from './layout-hash.js';
export { InvalidLayoutIdError, LayoutId } from './layout-id.js';
export {
  BASE_LAYOUT_GROUPS,
  STANDARD_LAYOUT_GROUP_NAMES,
  WIDE_LAYOUT_GROUP_NAMES,
} from './preset-config.js';
export type {
  LayoutData,
  LayoutGroupData,
  LayoutGroupSetting,
  LayoutSetting,
  MonitorType,
  SpaceCollectionData,
  SpaceData,
  SpacesRowData,
  UUIDGenerator,
} from './preset-generator.js';
export { generatePreset, getPresetName } from './preset-generator.js';
export { InvalidSpaceIdError, SpaceId } from './space-id.js';
