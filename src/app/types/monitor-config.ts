// Re-export domain types for backwards compatibility during migration
// TODO: Eventually remove this file and import directly from domain/types
export type {
  BoundingBox,
  Monitor,
  MonitorEnvironment,
  MonitorEnvironmentStorage,
} from '../../domain/types/monitor.js';
