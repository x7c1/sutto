import type { MonitorEnvironmentStorage } from '../../domain/monitor/index.js';

/**
 * Interface for persisting monitor environment configurations.
 */
export interface MonitorEnvironmentRepository {
  load(): MonitorEnvironmentStorage | null;
  save(storage: MonitorEnvironmentStorage): void;
}
