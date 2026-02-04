import type { Monitor } from '../../domain/monitor/index.js';

/**
 * Interface for monitor detection.
 * Infrastructure layer implements this with platform-specific detection.
 */
export interface MonitorProvider {
  detectMonitors(): Map<string, Monitor>;
  getMonitors(): Map<string, Monitor>;
  getMonitorAtPosition(x: number, y: number): Monitor | null;
}
