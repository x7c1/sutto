/**
 * Controller
 *
 * Main controller for Snappa extension.
 * Monitors window dragging and displays the main panel when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on panel buttons.
 */

import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import type { ExtensionSettings } from '../settings/extension-settings.js';
import { evaluate, parse } from './layout-expression/index.js';
import { MainPanel } from './main-panel/index.js';
import { loadLayoutHistory, setSelectedLayout } from './repository/layout-history.js';
import type { Layout, Position } from './types/index.js';

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
  private settings: ExtensionSettings | null;
  private hideShortcutRegistered: boolean = false;

  constructor(settings: ExtensionSettings | null, metadata: ExtensionMetadata) {
    this.settings = settings;

    // Load layout history
    loadLayoutHistory();

    // Initialize main panel with metadata
    this.mainPanel = new MainPanel(metadata);
    this.mainPanel.setOnLayoutSelected((layout) => {
      this.applyLayoutToCurrentWindow(layout);
    });
    // Register/unregister hide shortcut when panel is shown/hidden
    this.mainPanel.setOnPanelShown(() => {
      this.registerHidePanelShortcut();
    });
    this.mainPanel.setOnPanelHidden(() => {
      this.unregisterHidePanelShortcut();
    });
  }

  /**
   * Enable the controller
   */
  enable(): void {
    this.connectWindowDragSignals();
    this.registerShowPanelKeyboardShortcut();
  }

  /**
   * Connect window drag signals
   */
  private connectWindowDragSignals(): void {
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
   * Register show panel keyboard shortcut only
   * Hide panel shortcut is registered dynamically when panel is shown
   */
  private registerShowPanelKeyboardShortcut(): void {
    if (!this.settings) {
      log('[Controller] Settings not available, keyboard shortcuts not registered');
      return;
    }

    try {
      log('[Controller] Registering show panel keyboard shortcut...');
      this.registerShowPanelShortcut();
    } catch (e) {
      log(`[Controller] Failed to register show panel keyboard shortcut: ${e}`);
    }
  }

  /**
   * Register show panel keyboard shortcut
   */
  private registerShowPanelShortcut(): void {
    if (!this.settings) return;

    const shortcuts = this.settings.getShowPanelShortcut();
    log(`[Controller] Current show shortcut setting: ${JSON.stringify(shortcuts)}`);

    Main.wm.addKeybinding(
      'show-panel-shortcut',
      this.settings.getGSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      () => this.onShowPanelShortcut()
    );
    log('[Controller] Show panel keyboard shortcut registered successfully');
  }

  /**
   * Register hide panel keyboard shortcut (called when panel is shown)
   */
  private registerHidePanelShortcut(): void {
    if (!this.settings) return;
    if (this.hideShortcutRegistered) return; // Already registered

    const hideShortcuts = this.settings.getHidePanelShortcut();
    log(`[Controller] Current hide shortcut setting: ${JSON.stringify(hideShortcuts)}`);

    Main.wm.addKeybinding(
      'hide-panel-shortcut',
      this.settings.getGSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      () => this.onHidePanelShortcut()
    );
    this.hideShortcutRegistered = true;
    log('[Controller] Hide panel keyboard shortcut registered successfully');
  }

  /**
   * Unregister hide panel keyboard shortcut (called when panel is hidden)
   */
  private unregisterHidePanelShortcut(): void {
    if (!this.settings) return;
    if (!this.hideShortcutRegistered) return; // Not registered

    try {
      Main.wm.removeKeybinding('hide-panel-shortcut');
      this.hideShortcutRegistered = false;
      log('[Controller] Hide panel keyboard shortcut unregistered');
    } catch (e) {
      log(`[Controller] Failed to unregister hide panel keyboard shortcut: ${e}`);
    }
  }

  /**
   * Disable the controller
   */
  disable(): void {
    this.stopMotionMonitoring();
    this.disconnectWindowDragSignals();
    this.unregisterKeyboardShortcuts();
    this.clearEdgeTimer();
    this.resetState();
  }

  /**
   * Disconnect window drag signals
   */
  private disconnectWindowDragSignals(): void {
    if (this.grabOpBeginId !== null) {
      global.display.disconnect(this.grabOpBeginId);
      this.grabOpBeginId = null;
    }

    if (this.grabOpEndId !== null) {
      global.display.disconnect(this.grabOpEndId);
      this.grabOpEndId = null;
    }
  }

  /**
   * Unregister keyboard shortcuts
   */
  private unregisterKeyboardShortcuts(): void {
    if (!this.settings) return;

    try {
      Main.wm.removeKeybinding('show-panel-shortcut');
      this.unregisterHidePanelShortcut();
    } catch (e) {
      log(`[Controller] Failed to unregister keyboard shortcuts: ${e}`);
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

  /**
   * Handle keyboard shortcut to show main panel
   */
  private onShowPanelShortcut(): void {
    log('[Controller] ===== KEYBOARD SHORTCUT TRIGGERED =====');

    // If panel is already visible, hide it (toggle behavior)
    if (this.mainPanel.isVisible()) {
      log('[Controller] Panel is already visible, hiding it');
      this.mainPanel.hide();
      return;
    }

    // Get currently focused window
    const focusWindow = global.display.get_focus_window();

    if (!focusWindow) {
      log('[Controller] No focused window, ignoring shortcut');
      return;
    }

    log(`[Controller] Focused window: ${focusWindow.get_title()}`);

    // Get window frame rectangle to position panel at window center
    const frameRect = focusWindow.get_frame_rect();
    const windowCenter = {
      x: frameRect.x + frameRect.width / 2,
      y: frameRect.y + frameRect.height / 2,
    };
    log(`[Controller] Window center position: x=${windowCenter.x}, y=${windowCenter.y}`);

    // Store window reference (similar to drag behavior)
    this.currentWindow = focusWindow;
    this.lastDraggedWindow = focusWindow;

    // Show main panel at window center position with vertical centering
    log('[Controller] Showing main panel...');
    this.mainPanel.show(windowCenter, focusWindow, true);
    log('[Controller] Main panel shown');
  }

  /**
   * Handle keyboard shortcut to hide main panel
   */
  private onHidePanelShortcut(): void {
    log('[Controller] ===== HIDE PANEL SHORTCUT TRIGGERED =====');

    // Only hide if panel is visible
    if (this.mainPanel.isVisible()) {
      log('[Controller] Hiding panel');
      this.mainPanel.hide();
    } else {
      log('[Controller] Panel not visible, ignoring shortcut');
    }
  }
}
