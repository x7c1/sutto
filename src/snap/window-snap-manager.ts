/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Window Snap Manager
 *
 * Monitors window dragging and displays a snap menu when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on menu buttons.
 */

const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;

import { evaluate, parse } from './layout-expression';
import { type SnapLayout, SnapMenu } from './snap-menu';

declare function log(message: string): void;

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger menu
const EDGE_DELAY = 200; // milliseconds to wait before showing menu
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class WindowSnapManager {
  private grabOpBeginId: number | null = null;
  private grabOpEndId: number | null = null;
  private motionId: number | null = null;
  private currentWindow: Meta.Window | null = null;
  private lastDraggedWindow: Meta.Window | null = null;
  private isDragging: boolean = false;
  private edgeTimer: number | null = null;
  private isAtEdge: boolean = false;
  private snapMenu: SnapMenu;

  constructor() {
    // Initialize snap menu
    this.snapMenu = new SnapMenu();
    this.snapMenu.setOnLayoutSelected((layout) => {
      this.applyLayoutToCurrentWindow(layout);
    });
  }

  /**
   * Enable the window snap manager
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
   * Disable the window snap manager
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

      // Keep menu visible until a button is clicked
      // (menu will be hidden when layout is applied)
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
    const [x, y] = this.getCursorPosition();
    const atEdge = this.isAtScreenEdge(x, y);

    if (atEdge && !this.isAtEdge) {
      // Just reached edge - start timer
      this.isAtEdge = true;
      this.startEdgeTimer();
    } else if (!atEdge && this.isAtEdge && !this.snapMenu.isVisible()) {
      // Left edge and menu is not visible - cancel timer
      this.isAtEdge = false;
      this.clearEdgeTimer();
    }
    // Note: If menu is visible, keep isAtEdge true even if cursor is not at edge
    // This prevents the menu from disappearing when user moves cursor to menu

    // Update menu position if visible
    if (this.snapMenu.isVisible()) {
      this.snapMenu.updatePosition(x, y);
    }
  }

  /**
   * Start edge delay timer
   */
  private startEdgeTimer(): void {
    this.clearEdgeTimer();

    this.edgeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EDGE_DELAY, () => {
      if (this.isAtEdge && this.isDragging) {
        this.showSnapMenu();
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
  private getCursorPosition(): [number, number] {
    const [x, y] = global.get_pointer();
    return [x, y];
  }

  /**
   * Check if cursor is at screen edge
   */
  private isAtScreenEdge(x: number, y: number): boolean {
    // Get primary monitor geometry
    const monitor = global.display.get_current_monitor();
    const geometry = global.display.get_monitor_geometry(monitor);

    // Check if cursor is within EDGE_THRESHOLD of any edge
    const atLeft = x <= geometry.x + EDGE_THRESHOLD;
    const atRight = x >= geometry.x + geometry.width - EDGE_THRESHOLD;
    const atTop = y <= geometry.y + EDGE_THRESHOLD;
    const atBottom = y >= geometry.y + geometry.height - EDGE_THRESHOLD;

    return atLeft || atRight || atTop || atBottom;
  }

  /**
   * Show snap menu at cursor position
   */
  private showSnapMenu(): void {
    if (this.snapMenu.isVisible()) {
      return; // Already visible
    }

    const [x, y] = this.getCursorPosition();
    this.snapMenu.show(x, y);
  }

  /**
   * Apply layout to currently dragged window (called when menu button is clicked)
   */
  private applyLayoutToCurrentWindow(layout: SnapLayout): void {
    log(`[WindowSnapManager] Apply layout: ${layout.label}`);

    // Use lastDraggedWindow since currentWindow might be null if drag just ended
    const targetWindow = this.currentWindow || this.lastDraggedWindow;

    if (!targetWindow) {
      log('[WindowSnapManager] No window to apply layout to');
      return;
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
      `[WindowSnapManager] Moving window to x=${x}, y=${y}, w=${width}, h=${height} (work area: ${workArea.x},${workArea.y} ${workArea.width}x${workArea.height})`
    );

    // Unmaximize window if maximized
    if (targetWindow.get_maximized()) {
      log('[WindowSnapManager] Unmaximizing window');
      targetWindow.unmaximize(3); // Both horizontally and vertically
    }

    // Move and resize window
    targetWindow.move_resize_frame(false, x, y, width, height);
    log('[WindowSnapManager] Window moved');
  }
}
