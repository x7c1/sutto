/**
 * Controller - Simplified version for Step 4
 *
 * Main controller for Snappa extension.
 * Monitors window dragging and displays the main panel when the cursor reaches screen edges.
 */

import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type {ExtensionSettings} from '../settings/extension-settings.js';
import {MainPanel} from './main-panel/index.js';

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger panel
const EDGE_DELAY = 200; // milliseconds to wait before showing panel
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class Controller {
  private grabOpBeginId: number | null = null;
  private grabOpEndId: number | null = null;
  private motionId: number | null = null;
  private currentWindow: Meta.Window | null = null;
  private isDragging: boolean = false;
  private edgeTimer: number | null = null;
  private isAtEdge: boolean = false;
  private mainPanel: MainPanel;
  private settings: ExtensionSettings | null;

  constructor(settings: ExtensionSettings | null) {
    this.settings = settings;
    this.mainPanel = new MainPanel();
  }

  /**
   * Enable the controller
   */
  enable(): void {
    console.log('[Controller] Enabling controller...');
    this.connectWindowDragSignals();
    console.log('[Controller] Controller enabled');
  }

  /**
   * Connect window drag signals
   */
  private connectWindowDragSignals(): void {
    const display = (global as any).display;

    // Connect to grab-op-begin signal to detect window dragging
    this.grabOpBeginId = display.connect(
      'grab-op-begin',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        this.onGrabOpBegin(window, op);
      }
    );

    // Connect to grab-op-end signal to detect when dragging stops
    this.grabOpEndId = display.connect(
      'grab-op-end',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        this.onGrabOpEnd(window, op);
      }
    );

    console.log('[Controller] Window drag signals connected');
  }

  /**
   * Handle grab operation begin
   */
  private onGrabOpBegin(window: Meta.Window, op: Meta.GrabOp): void {
    // Check if this is a window move operation
    if (op === Meta.GrabOp.MOVING) {
      console.log('[Controller] Window drag started');
      this.currentWindow = window;
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
      console.log('[Controller] Window drag ended');
      this.isDragging = false;
      this.currentWindow = null;
      this.isAtEdge = false;

      // Stop monitoring cursor position
      this.stopMotionMonitoring();

      // Clear edge timer
      this.clearEdgeTimer();
    }
  }

  /**
   * Start monitoring cursor position
   */
  private startMotionMonitoring(): void {
    if (this.motionId !== null) {
      return; // Already monitoring
    }

    this.motionId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, MONITOR_INTERVAL, () => {
      if (!this.isDragging) {
        this.motionId = null;
        return GLib.SOURCE_REMOVE;
      }

      this.checkCursorPosition();
      return GLib.SOURCE_CONTINUE;
    });
  }

  /**
   * Stop monitoring cursor position
   */
  private stopMotionMonitoring(): void {
    if (this.motionId !== null) {
      GLib.Source.remove(this.motionId);
      this.motionId = null;
    }
  }

  /**
   * Check if cursor is at screen edge
   */
  private checkCursorPosition(): void {
    const [x, y] = (global as any).get_pointer();
    const monitor = (Main.layoutManager as any).currentMonitor;

    if (!monitor) {
      return;
    }

    const atLeftEdge = x - monitor.x < EDGE_THRESHOLD;
    const atRightEdge = monitor.x + monitor.width - x < EDGE_THRESHOLD;
    const atTopEdge = y - monitor.y < EDGE_THRESHOLD;
    const atBottomEdge = monitor.y + monitor.height - y < EDGE_THRESHOLD;

    const nowAtEdge = atLeftEdge || atRightEdge || atTopEdge || atBottomEdge;

    if (nowAtEdge && !this.isAtEdge) {
      // Just reached edge - start timer
      console.log('[Controller] Cursor reached edge');
      this.isAtEdge = true;
      this.startEdgeTimer(x, y);
    } else if (!nowAtEdge && this.isAtEdge) {
      // Left edge - cancel timer
      console.log('[Controller] Cursor left edge');
      this.isAtEdge = false;
      this.clearEdgeTimer();
    }
  }

  /**
   * Start edge timer
   */
  private startEdgeTimer(x: number, y: number): void {
    if (this.edgeTimer !== null) {
      return; // Timer already running
    }

    this.edgeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EDGE_DELAY, () => {
      console.log('[Controller] Edge delay elapsed - showing panel');
      this.showPanelAtCursor(x, y);
      this.edgeTimer = null;
      return GLib.SOURCE_REMOVE;
    });
  }

  /**
   * Clear edge timer
   */
  private clearEdgeTimer(): void {
    if (this.edgeTimer !== null) {
      GLib.Source.remove(this.edgeTimer);
      this.edgeTimer = null;
    }
  }

  /**
   * Show panel at cursor position
   */
  private showPanelAtCursor(x: number, y: number): void {
    if (!this.mainPanel.isVisible()) {
      console.log(`[Controller] Showing panel at cursor position: ${x}, ${y}`);
      // Set current window in panel
      this.mainPanel.setCurrentWindow(this.currentWindow);
      // Show panel at cursor position
      this.mainPanel.show(x, y);
    }
  }

  /**
   * Disable the controller
   */
  disable(): void {
    console.log('[Controller] Disabling controller...');
    this.stopMotionMonitoring();
    this.disconnectWindowDragSignals();
    this.clearEdgeTimer();
    this.resetState();

    // Hide panel
    if (this.mainPanel) {
      this.mainPanel.hide();
    }

    console.log('[Controller] Controller disabled');
  }

  /**
   * Disconnect window drag signals
   */
  private disconnectWindowDragSignals(): void {
    const display = (global as any).display;

    if (this.grabOpBeginId !== null) {
      display.disconnect(this.grabOpBeginId);
      this.grabOpBeginId = null;
    }

    if (this.grabOpEndId !== null) {
      display.disconnect(this.grabOpEndId);
      this.grabOpEndId = null;
    }
  }

  /**
   * Reset controller state
   */
  private resetState(): void {
    this.currentWindow = null;
    this.isDragging = false;
    this.isAtEdge = false;
  }
}
