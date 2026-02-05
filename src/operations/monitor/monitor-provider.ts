import type { Monitor } from '../../domain/monitor/index.js';

/**
 * Interface for providing monitor information.
 * Infrastructure layer implements this with platform-specific APIs.
 */
export interface MonitorProvider {
  detectMonitors(): Map<string, Monitor>;
  getMonitors(): Map<string, Monitor>;
  getMonitorAtPosition(x: number, y: number): Monitor | null;
}
