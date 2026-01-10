/**
 * Controller
 *
 * Main controller for Snappa extension.
 * Monitors window dragging and displays the main panel when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on panel buttons.
 *
 * DESIGN PRINCIPLES:
 * - Controller should NOT contain business logic - delegate to dedicated classes
 * - Controller's role is to coordinate between components and handle signals
 * - Keep methods thin - extract complex logic into XxxManager or XxxHandler classes
 * - Each responsibility should be handled by a single dedicated class
 */

import Meta from 'gi://Meta';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';

import type { ExtensionSettings } from '../settings/extension-settings.js';
import { DragSignalHandler } from './drag/drag-signal-handler.js';
import { EdgeDetector } from './drag/edge-detector.js';
import { EdgeTimerManager } from './drag/edge-timer-manager.js';
import { MotionMonitor } from './drag/motion-monitor.js';
import { MainPanel } from './main-panel/index.js';
import { MonitorManager } from './monitor/manager.js';
import { LayoutHistoryRepository } from './repository/layout-history.js';
import { KeyboardShortcutManager } from './shortcuts/keyboard-shortcut-manager.js';
import type { Layout, Position } from './types/index.js';
import { LayoutApplicator } from './window/layout-applicator.js';

declare function log(message: string): void;

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger panel
const EDGE_DELAY = 200; // milliseconds to wait before showing panel
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class Controller {
  private currentWindow: Meta.Window | null = null;
  private lastDraggedWindow: Meta.Window | null = null;
  private isDragging: boolean = false;
  private isAtEdge: boolean = false;
  private mainPanel: MainPanel;
  private monitorManager: MonitorManager;
  private edgeDetector: EdgeDetector;
  private edgeTimerManager: EdgeTimerManager;
  private motionMonitor: MotionMonitor;
  private layoutApplicator: LayoutApplicator;
  private keyboardShortcutManager: KeyboardShortcutManager;
  private dragSignalHandler: DragSignalHandler;

  constructor(settings: ExtensionSettings, metadata: ExtensionMetadata) {
    // Initialize monitor manager
    this.monitorManager = new MonitorManager();

    // Initialize layout history repository
    const layoutHistoryRepository = new LayoutHistoryRepository();
    layoutHistoryRepository.load();

    // Initialize drag-related managers
    this.edgeDetector = new EdgeDetector(EDGE_THRESHOLD);
    this.edgeTimerManager = new EdgeTimerManager(EDGE_DELAY);
    this.motionMonitor = new MotionMonitor(MONITOR_INTERVAL);
    this.dragSignalHandler = new DragSignalHandler();

    // Initialize layout applicator
    this.layoutApplicator = new LayoutApplicator(this.monitorManager, layoutHistoryRepository, {
      onLayoutApplied: (layoutId, monitorKey) => {
        this.mainPanel.updateSelectedLayoutHighlight(layoutId, monitorKey);
      },
    });

    // Initialize keyboard shortcut manager
    this.keyboardShortcutManager = new KeyboardShortcutManager(settings);

    // Initialize main panel with metadata, monitor manager, and layout history repository
    this.mainPanel = new MainPanel(metadata, this.monitorManager, layoutHistoryRepository);
    // Receive monitorKey from layout selection for per-monitor application
    this.mainPanel.setOnLayoutSelected((layout, monitorKey) => {
      this.applyLayoutToCurrentWindow(layout, monitorKey);
    });
    // Register/unregister hide shortcut when panel is shown/hidden
    this.mainPanel.setOnPanelShown(() => {
      this.keyboardShortcutManager.registerHidePanelShortcut(() => this.onHidePanelShortcut());
    });
    this.mainPanel.setOnPanelHidden(() => {
      this.keyboardShortcutManager.unregisterHidePanelShortcut();
    });
  }

  /**
   * Enable the controller
   */
  enable(): void {
    // Detect monitors
    this.monitorManager.detectMonitors();

    // Connect to monitor changes
    this.monitorManager.connectToMonitorChanges(() => {
      // Re-render panel if visible when monitors change
      if (this.mainPanel.isVisible()) {
        const cursor = this.getCursorPosition();
        const window = this.getCurrentWindow();
        this.mainPanel.show(cursor, window);
      }
    });

    // Connect window drag signals
    this.dragSignalHandler.connect({
      onDragBegin: (window, op) => this.onGrabOpBegin(window, op),
      onDragEnd: (window, op) => this.onGrabOpEnd(window, op),
    });

    // Register keyboard shortcuts
    this.keyboardShortcutManager.registerShowPanelShortcut(() => this.onShowPanelShortcut());
  }

  /**
   * Disable the controller
   */
  disable(): void {
    this.motionMonitor.stop();
    this.dragSignalHandler.disconnect();
    this.keyboardShortcutManager.unregisterAll();
    this.edgeTimerManager.clear();
    this.resetState();

    // Disconnect monitor changes
    this.monitorManager.disconnectMonitorChanges();
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
    if (op !== Meta.GrabOp.MOVING) {
      return;
    }

    this.currentWindow = window;
    this.lastDraggedWindow = window;
    this.isDragging = true;

    // Start monitoring cursor position
    this.motionMonitor.start(() => {
      if (!this.isDragging) {
        return false; // Stop monitoring
      }
      this.onMotion();
      return true; // Continue monitoring
    });
  }

  /**
   * Handle grab operation end
   */
  private onGrabOpEnd(window: Meta.Window, op: Meta.GrabOp): void {
    // Check if this is the end of a window move operation
    if (op !== Meta.GrabOp.MOVING || window !== this.currentWindow) {
      return;
    }

    this.isDragging = false;
    this.currentWindow = null;
    this.isAtEdge = false;

    // Stop monitoring cursor position
    this.motionMonitor.stop();

    // Clear edge timer
    this.edgeTimerManager.clear();

    // Keep panel visible until a button is clicked
    // (panel will be hidden when layout is applied)
  }

  /**
   * Handle cursor motion during drag
   */
  private onMotion(): void {
    const cursor = this.getCursorPosition();
    const monitor = this.monitorManager.getCurrentMonitor();
    const atEdge = this.edgeDetector.isAtScreenEdge(cursor, monitor);

    if (atEdge && !this.isAtEdge) {
      // Just reached edge - start timer
      this.isAtEdge = true;
      this.edgeTimerManager.start(() => {
        if (this.isAtEdge && this.isDragging) {
          this.showMainPanel();
        }
      });
    } else if (!atEdge && this.isAtEdge && !this.mainPanel.isVisible()) {
      // Left edge and panel is not visible - cancel timer
      this.isAtEdge = false;
      this.edgeTimerManager.clear();
    }
    // Note: If panel is visible, keep isAtEdge true even if cursor is not at edge
    // This prevents the panel from disappearing when user moves cursor to panel

    // Update panel position if visible
    if (this.mainPanel.isVisible()) {
      this.mainPanel.updatePosition(cursor);
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
  private applyLayoutToCurrentWindow(layout: Layout, monitorKey?: string): void {
    // Use lastDraggedWindow since currentWindow might be null if drag just ended
    const targetWindow = this.currentWindow || this.lastDraggedWindow;
    this.layoutApplicator.applyLayout(targetWindow, layout, monitorKey);
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
