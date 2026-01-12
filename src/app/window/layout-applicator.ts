/**
 * LayoutApplicator
 *
 * Applies layouts to windows.
 * Handles layout expression evaluation, window positioning, and history recording.
 */

import type Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

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
  applyLayout(window: Meta.Window | null, layout: Layout): void {
    log(`[LayoutApplicator] Apply layout: ${layout.label} (ID: ${layout.id})`);

    if (!window) {
      log('[LayoutApplicator] No window to apply layout to');
      return;
    }

    log(`[LayoutApplicator] Using monitor from layout: ${layout.monitorKey}`);
    const targetMonitor = this.monitorManager.getMonitorByKey(layout.monitorKey);
    if (!targetMonitor) {
      log(`[LayoutApplicator] Could not find monitor with key: ${layout.monitorKey}`);
      return;
    }

    // Get fresh workArea directly from GNOME Shell (not from cached monitor info)
    // This ensures we always use the current workArea, especially after monitor changes
    const workArea = Main.layoutManager.getWorkAreaForMonitor(targetMonitor.index);

    const windowId = window.get_id();
    const wmClass = window.get_wm_class();
    const title = window.get_title();
    if (wmClass) {
      this.layoutHistoryRepository.setSelectedLayout(windowId, wmClass, title, layout.id);
      if (this.callbacks.onLayoutApplied) {
        this.callbacks.onLayoutApplied(layout.id, layout.monitorKey);
      }
    } else {
      log('[LayoutApplicator] Window has no WM_CLASS, skipping history update');
    }

    const resolve = (value: string, containerSize: number): number => {
      const expr = parse(value);
      return evaluate(expr, containerSize);
    };

    const x = workArea.x + resolve(layout.x, workArea.width);
    const y = workArea.y + resolve(layout.y, workArea.height);
    const width = resolve(layout.width, workArea.width);
    const height = resolve(layout.height, workArea.height);

    log(
      `[LayoutApplicator] Moving window to x=${x}, y=${y}, w=${width}, h=${height} (work area: ${workArea.x},${workArea.y} ${workArea.width}x${workArea.height})`
    );

    if (window.get_maximized()) {
      log('[LayoutApplicator] Unmaximizing window');
      window.unmaximize(3); // Both horizontally and vertically
    }

    // Apply position and size
    // Workaround: Some applications (e.g., Gnome-terminal) ignore position when move_resize_frame
    // is called with both position and size changes simultaneously.
    // To ensure reliable positioning across all applications, we first set the position with
    // move_frame, then apply both position and size with move_resize_frame.
    //
    // Note: user_op=true is required for cross-monitor movement in multi-monitor setups.
    // When user_op=false, GNOME restricts window movement between monitors.
    window.move_frame(true, x, y);
    window.move_resize_frame(true, x, y, width, height);

    log('[LayoutApplicator] Window moved');
  }
}
