/**
 * LayoutApplicator
 *
 * Applies layouts to windows.
 * Handles layout expression evaluation, window positioning, and history recording.
 */

import type Meta from 'gi://Meta';

import { evaluate, parse } from '../layout-expression/index.js';
import type { MonitorManager } from '../monitor/manager.js';
import type { LayoutHistoryRepository } from '../repository/layout-history.js';
import type { Layout } from '../types/index.js';

declare function log(message: string): void;

export interface LayoutApplicationCallbacks {
  onLayoutApplied?: (layoutId: string, monitorKey: string) => void;
}

export class LayoutApplicator {
  constructor(
    private readonly monitorManager: MonitorManager,
    private readonly layoutHistoryRepository: LayoutHistoryRepository,
    private readonly callbacks: LayoutApplicationCallbacks = {}
  ) {}

  /**
   * Apply layout to window
   */
  applyLayout(window: Meta.Window | null, layout: Layout, monitorKey?: string): void {
    log(`[LayoutApplicator] Apply layout: ${layout.label} (ID: ${layout.id})`);

    if (!window) {
      log('[LayoutApplicator] No window to apply layout to');
      return;
    }

    // Determine which monitor to use
    let targetMonitor: import('../types/index.js').Monitor | null;
    if (monitorKey !== undefined) {
      // Use explicitly specified monitor from user selection
      log(`[LayoutApplicator] Using user-selected monitor: ${monitorKey}`);
      targetMonitor = this.monitorManager.getMonitorByKey(monitorKey);
      if (!targetMonitor) {
        log(`[LayoutApplicator] Could not find monitor with key: ${monitorKey}`);
        return;
      }
    } else {
      // Fallback: Auto-detect monitor from window (for keyboard shortcuts)
      log('[LayoutApplicator] Auto-detecting monitor from window');
      targetMonitor = this.monitorManager.getMonitorForWindow(window);
      if (!targetMonitor) {
        log('[LayoutApplicator] Could not determine monitor for window');
        return;
      }
      monitorKey = String(targetMonitor.index);
    }
    const workArea = targetMonitor.workArea;

    // Record layout selection in history
    const windowId = window.get_id();
    const wmClass = window.get_wm_class();
    const title = window.get_title();
    if (wmClass) {
      // Use per-monitor history
      this.layoutHistoryRepository.setSelectedLayoutForMonitor(
        monitorKey,
        windowId,
        wmClass,
        title,
        layout.id
      );
      // Notify callback for UI updates
      if (this.callbacks.onLayoutApplied) {
        this.callbacks.onLayoutApplied(layout.id, monitorKey);
      }
    } else {
      log('[LayoutApplicator] Window has no WM_CLASS, skipping history update');
    }

    // Helper to resolve layout values
    const resolve = (value: string, containerSize: number): number => {
      const expr = parse(value);
      return evaluate(expr, containerSize);
    };

    // Calculate window position and size based on layout
    const x = workArea.x + resolve(layout.x, workArea.width);
    const y = workArea.y + resolve(layout.y, workArea.height);
    const width = resolve(layout.width, workArea.width);
    const height = resolve(layout.height, workArea.height);

    log(
      `[LayoutApplicator] Moving window to x=${x}, y=${y}, w=${width}, h=${height} (work area: ${workArea.x},${workArea.y} ${workArea.width}x${workArea.height})`
    );

    // Unmaximize window if maximized
    if (window.get_maximized()) {
      log('[LayoutApplicator] Unmaximizing window');
      window.unmaximize(3); // Both horizontally and vertically
    }

    // Move and resize window
    window.move_resize_frame(false, x, y, width, height);
    log('[LayoutApplicator] Window moved');
  }
}
