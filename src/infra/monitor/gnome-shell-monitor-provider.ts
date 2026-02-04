/**
 * GNOME Shell Monitor Provider
 *
 * WARNING: This module depends on GNOME Shell APIs (main.js) and can only be used
 * in the extension context. Do NOT import this from prefs or other GTK-only contexts.
 *
 * Provides monitor detection from GNOME Shell.
 * Tracks connected monitors and provides lookup methods.
 */

import type Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { BoundingBox, Monitor } from '../../domain/monitor/index.js';
import type { MonitorProvider } from '../../usecase/monitor/index.js';

declare function log(message: string): void;

export class GnomeShellMonitorProvider implements MonitorProvider {
  private monitors: Map<string, Monitor> = new Map();
  private monitorsChangedId: number | null = null;

  /**
   * Detect all connected monitors.
   */
  detectMonitors(): Map<string, Monitor> {
    const monitors = new Map<string, Monitor>();
    const nMonitors = global.display.get_n_monitors();
    const primaryMonitorIndex = global.display.get_primary_monitor();

    log(
      `[GnomeShellMonitorProvider] Detecting ${nMonitors} monitors (primary: ${primaryMonitorIndex})`
    );

    for (let i = 0; i < nMonitors; i++) {
      const geometry = global.display.get_monitor_geometry(i);
      const workArea = Main.layoutManager.getWorkAreaForMonitor(i);
      const isPrimary = i === primaryMonitorIndex;

      const monitor: Monitor = {
        index: i,
        geometry: {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        workArea: {
          x: workArea.x,
          y: workArea.y,
          width: workArea.width,
          height: workArea.height,
        },
        isPrimary,
      };

      monitors.set(String(i), monitor);
      log(
        `[GnomeShellMonitorProvider] Monitor ${i}: ${geometry.width}x${geometry.height} at (${geometry.x}, ${geometry.y})${isPrimary ? ' (PRIMARY)' : ''}`
      );
    }

    this.monitors = monitors;
    return monitors;
  }

  /**
   * Get all monitors.
   */
  getMonitors(): Map<string, Monitor> {
    return this.monitors;
  }

  /**
   * Get monitor by key (e.g., "0", "1", "2").
   */
  getMonitorByKey(monitorKey: string): Monitor | null {
    return this.monitors.get(monitorKey) ?? null;
  }

  /**
   * Get current monitor (based on cursor position or focused window).
   */
  getCurrentMonitor(): Monitor | null {
    const monitorIndex = global.display.get_current_monitor();
    return this.getMonitorByKey(String(monitorIndex));
  }

  /**
   * Get monitor at position (for cursor-based detection).
   */
  getMonitorAtPosition(x: number, y: number): Monitor | null {
    for (const monitor of this.monitors.values()) {
      const { geometry } = monitor;
      if (
        x >= geometry.x &&
        x < geometry.x + geometry.width &&
        y >= geometry.y &&
        y < geometry.y + geometry.height
      ) {
        return monitor;
      }
    }
    return null;
  }

  /**
   * Get monitor for window (which monitor a window is on).
   */
  getMonitorForWindow(window: Meta.Window): Monitor | null {
    const rect = window.get_frame_rect();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    return this.getMonitorAtPosition(centerX, centerY);
  }

  /**
   * Connect to monitor configuration changes.
   */
  connectToMonitorChanges(onMonitorsChanged: () => void): void {
    if (this.monitorsChangedId !== null) {
      log('[GnomeShellMonitorProvider] Already connected to monitors-changed signal');
      return;
    }

    this.monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
      log('[GnomeShellMonitorProvider] Monitors configuration changed');
      onMonitorsChanged();
    });

    log('[GnomeShellMonitorProvider] Connected to monitors-changed signal');
  }

  /**
   * Disconnect from monitor configuration changes.
   */
  disconnectMonitorChanges(): void {
    if (this.monitorsChangedId !== null) {
      Main.layoutManager.disconnect(this.monitorsChangedId);
      this.monitorsChangedId = null;
      log('[GnomeShellMonitorProvider] Disconnected from monitors-changed signal');
    }
  }

  /**
   * Calculate bounding box that contains all monitors.
   */
  calculateBoundingBox(monitors: Monitor[]): BoundingBox {
    if (monitors.length === 0) {
      return { minX: 0, minY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const monitor of monitors) {
      const { geometry } = monitor;
      minX = Math.min(minX, geometry.x);
      minY = Math.min(minY, geometry.y);
      maxX = Math.max(maxX, geometry.x + geometry.width);
      maxY = Math.max(maxY, geometry.y + geometry.height);
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
