// Domain Layer
// Contains validated types and domain models with constructor-based validation
// No I/O dependencies - pure business logic only

// Domain modules
export * from './history/index.js';
export type {
  MonitorType,
  PresetLayoutData,
  PresetLayoutGroupData,
  PresetSpaceCollectionData,
  PresetSpaceData,
  PresetSpacesRowData,
  UUIDGenerator,
} from './layout/index.js';
export {
  CollectionId,
  generateLayoutHash,
  generatePreset,
  getPresetName,
  InvalidCollectionIdError,
  InvalidLayoutIdError,
  InvalidSpaceIdError,
  LayoutId,
  SpaceId,
} from './layout/index.js';
export * from './layout-expression/index.js';
export * from './licensing/index.js';
export type {
  Dimensions,
  MainPanelPositionOptions,
  ScreenBoundaries,
} from './positioning/index.js';
export { adjustMainPanelPosition } from './positioning/index.js';
// Core domain types
export * from './types/index.js';
