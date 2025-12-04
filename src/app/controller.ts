/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Controller
 *
 * Main controller for Snappa extension.
 * Monitors window dragging and displays the main panel when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on panel buttons.
 */

const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;

import { evaluate, parse } from './layout-expression';
import { MainPanel } from './main-panel/index';
import { loadLayoutHistory, setSelectedLayout } from './repository/layout-history';
import type { Layout, Position } from './types';

declare function log(message: string): void;

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger panel
const EDGE_DELAY = 200; // milliseconds to wait before showing panel
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class Controller {
  private grabOpBeginId: number | null = null;
  private grabOpEndId: number | null = null;
  private motionId: number | null = null;
  private currentWindow: Meta.Window | null = null;
  private lastDraggedWindow: Meta.Window | null = null;
  private isDragging: boolean = false;
  private edgeTimer: number | null = null;
  private isAtEdge: boolean = false;
  private mainPanel: MainPanel;

  constructor() {
    // Load layout history
    loadLayoutHistory();

    // Initialize main panel
    this.mainPanel = new MainPanel();
    this.mainPanel.setOnLayoutSelected((layout) => {
      this.applyLayoutToCurrentWindow(layout);
    });
  }

  /**
   * Enable the controller
   */
  enable(): void {
    // Connect to grab-op-begin signal to detect window dragging
    this.grabOpBeginId = global.display.connect(
      'grab-op-begin',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        this.onGrabOpBegin(window, op);
      }
    );

    // Connect to grab-op-end signal to detect when dragging stops
    this.grabOpEndId = global.display.connect(
      'grab-op-end',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        this.onGrabOpEnd(window, op);
      }
    );
  }

  /**
   * Disable the controller
   */
  disable(): void {
    // Stop motion monitoring
    this.stopMotionMonitoring();

    // Disconnect signals
    if (this.grabOpBeginId !== null) {
      global.display.disconnect(this.grabOpBeginId);
      this.grabOpBeginId = null;
    }

    if (this.grabOpEndId !== null) {
      global.display.disconnect(this.grabOpEndId);
      this.grabOpEndId = null;
    }

    // Clean up edge timer
    this.clearEdgeTimer();

    // Reset state
    this.currentWindow = null;
    this.isDragging = false;
    this.isAtEdge = false;
  }

  /**
   * Handle grab operation begin
   */
  private onGrabOpBegin(window: Meta.Window, op: Meta.GrabOp): void {
    // Check if this is a window move operation
    if (op === Meta.GrabOp.MOVING) {
      this.currentWindow = window;
      this.lastDraggedWindow = window;
      this.isDragging = true;

      // Start monitoring cursor position
      this.startMotionMonitoring();
    }
  }

  /**
   * Handle grab operation end
   */
  private onGrabOpEnd(window: Meta.Window, op: Meta.GrabOp): void {
    // Check if this is the end of a window move operation
    if (op === Meta.GrabOp.MOVING && window === this.currentWindow) {
      this.isDragging = false;
      this.currentWindow = null;
      this.isAtEdge = false;

      // Stop monitoring cursor position
      this.stopMotionMonitoring();

      // Clear edge timer
      this.clearEdgeTimer();

      // Keep panel visible until a button is clicked
      // (panel will be hidden when layout is applied)
    }
  }

  /**
   * Start monitoring cursor motion
   */
  private startMotionMonitoring(): void {
    if (this.motionId !== null) {
      return; // Already monitoring
    }

    // Use GLib.timeout_add to periodically check cursor position
    this.motionId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, MONITOR_INTERVAL, () => {
      if (!this.isDragging) {
        this.motionId = null;
        return false; // Stop monitoring
      }

      this.onMotion();
      return true; // Continue monitoring
    });
  }

  /**
   * Stop monitoring cursor motion
   */
  private stopMotionMonitoring(): void {
    if (this.motionId !== null) {
      GLib.Source.remove(this.motionId);
      this.motionId = null;
    }
  }

  /**
   * Handle cursor motion during drag
   */
  private onMotion(): void {
    const cursor = this.getCursorPosition();
    const atEdge = this.isAtScreenEdge(cursor);

    if (atEdge && !this.isAtEdge) {
      // Just reached edge - start timer
      this.isAtEdge = true;
      this.startEdgeTimer();
    } else if (!atEdge && this.isAtEdge && !this.mainPanel.isVisible()) {
      // Left edge and panel is not visible - cancel timer
      this.isAtEdge = false;
      this.clearEdgeTimer();
    }
    // Note: If panel is visible, keep isAtEdge true even if cursor is not at edge
    // This prevents the panel from disappearing when user moves cursor to panel

    // Update panel position if visible
    if (this.mainPanel.isVisible()) {
      this.mainPanel.updatePosition(cursor);
    }
  }

  /**
   * Start edge delay timer
   */
  private startEdgeTimer(): void {
    this.clearEdgeTimer();

    this.edgeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EDGE_DELAY, () => {
      if (this.isAtEdge && this.isDragging) {
        this.showMainPanel();
      }
      this.edgeTimer = null;
      return false; // Don't repeat
    });
  }

  /**
   * Clear edge delay timer
   */
  private clearEdgeTimer(): void {
    if (this.edgeTimer !== null) {
      GLib.Source.remove(this.edgeTimer);
      this.edgeTimer = null;
    }
  }

  /**
   * Get current cursor position
   */
  private getCursorPosition(): Position {
    const [x, y] = global.get_pointer();
    return { x, y };
  }

  /**
   * Check if cursor is at screen edge
   */
  private isAtScreenEdge(cursor: Position): boolean {
    // Get primary monitor geometry
    const monitor = global.display.get_current_monitor();
    const geometry = global.display.get_monitor_geometry(monitor);

    // Check if cursor is within EDGE_THRESHOLD of any edge
    const atLeft = cursor.x <= geometry.x + EDGE_THRESHOLD;
    const atRight = cursor.x >= geometry.x + geometry.width - EDGE_THRESHOLD;
    const atTop = cursor.y <= geometry.y + EDGE_THRESHOLD;
    const atBottom = cursor.y >= geometry.y + geometry.height - EDGE_THRESHOLD;

    return atLeft || atRight || atTop || atBottom;
  }

  /**
   * Get current window
   */
  private getCurrentWindow(): Meta.Window | null {
    return this.currentWindow || this.lastDraggedWindow;
  }

  /**
   * Show main panel at cursor position
   */
  private showMainPanel(): void {
    if (this.mainPanel.isVisible()) {
      return; // Already visible
    }

    const cursor = this.getCursorPosition();
    const window = this.getCurrentWindow();
    this.mainPanel.show(cursor, window);
  }

  /**
   * Apply layout to currently dragged window (called when panel button is clicked)
   */
  private applyLayoutToCurrentWindow(layout: Layout): void {
    log(`[Controller] Apply layout: ${layout.label} (ID: ${layout.id})`);

    // Use lastDraggedWindow since currentWindow might be null if drag just ended
    const targetWindow = this.currentWindow || this.lastDraggedWindow;

    if (!targetWindow) {
      log('[Controller] No window to apply layout to');
      return;
    }

    // Record layout selection in history
    const windowId = targetWindow.get_id();
    const wmClass = targetWindow.get_wm_class();
    const title = targetWindow.get_title();
    if (wmClass) {
      setSelectedLayout(windowId, wmClass, title, layout.id);
      // Update panel button styles immediately
      this.mainPanel.updateSelectedLayoutHighlight(layout.id);
    } else {
      log('[Controller] Window has no WM_CLASS, skipping history update');
    }

    // Get work area (excludes panels, top bar, etc.)
    const monitor = global.display.get_current_monitor();
    const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);

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
      `[Controller] Moving window to x=${x}, y=${y}, w=${width}, h=${height} (work area: ${workArea.x},${workArea.y} ${workArea.width}x${workArea.height})`
    );

    // Unmaximize window if maximized
    if (targetWindow.get_maximized()) {
      log('[Controller] Unmaximizing window');
      targetWindow.unmaximize(3); // Both horizontally and vertically
    }

    // Move and resize window
    targetWindow.move_resize_frame(false, x, y, width, height);
    log('[Controller] Window moved');
  }
}
