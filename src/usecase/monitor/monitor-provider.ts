import type { Monitor } from '../../domain/monitor/index.js';

/**
 * Interface for monitor access used by UI layer.
 */
export interface MonitorProvider {
  /**
   * Get all monitors
   */
  getMonitors(): Map<string, Monitor>;

  /**
   * Get monitor at position (for cursor-based detection)
   */
  getMonitorAtPosition(x: number, y: number): Monitor | null;

  /**
   * Get monitors for rendering a specific display count.
   * Returns monitors and keys of monitors that don't exist in current physical setup.
   */
  getMonitorsForRendering(displayCount: number): {
    monitors: Map<string, Monitor>;
    inactiveMonitorKeys: Set<string>;
  };
}
