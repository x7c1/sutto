import Gdk from 'gi://Gdk';

import type { MonitorDetector } from '../../operations/monitor/monitor-detector.js';

const log = (message: string): void => console.log(message);

/**
 * Gdk-based implementation of MonitorDetector.
 * Detects monitor count using Gdk Display API.
 */
export class GdkMonitorDetector implements MonitorDetector {
  detectMonitorCount(): number {
    try {
      const display = Gdk.Display.get_default();
      if (!display) {
        return 0;
      }

      const monitorList = display.get_monitors();
      if (!monitorList) {
        return 0;
      }

      return monitorList.get_n_items();
    } catch (e) {
      log(`[GdkMonitorDetector] Error getting monitor count: ${e}`);
      return 0;
    }
  }
}
