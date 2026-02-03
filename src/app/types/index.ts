// Re-export domain types for backwards compatibility during migration
// TODO: Eventually remove this file and import directly from domain/types
export type {
  BoundingBox,
  Layout,
  LayoutConfiguration,
  LayoutGroup,
  LayoutGroupSetting,
  LayoutPosition,
  LayoutSelectedEvent,
  LayoutSetting,
  LayoutSize,
  Monitor,
  MonitorEnvironment,
  MonitorEnvironmentStorage,
  Position,
  Size,
  Space,
  SpaceCollection,
  SpaceSetting,
  SpacesRow,
  SpacesRowSetting,
} from '../../domain/types/index.js';

// UI-specific types stay in app layer
export type { LayoutButtonWithMetadata } from './button.js';
