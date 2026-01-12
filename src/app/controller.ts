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
  private layoutHistoryRepository: LayoutHistoryRepository;
  private historyLoaded: boolean = false;

  constructor(settings: ExtensionSettings, metadata: ExtensionMetadata) {
    this.monitorManager = new MonitorManager();

    // Lazy load to avoid I/O until panel is actually displayed
    this.layoutHistoryRepository = new LayoutHistoryRepository();

    this.edgeDetector = new EdgeDetector(EDGE_THRESHOLD);
    this.edgeTimerManager = new EdgeTimerManager(EDGE_DELAY);
    this.motionMonitor = new MotionMonitor(MONITOR_INTERVAL);
    this.dragSignalHandler = new DragSignalHandler();

    this.layoutApplicator = new LayoutApplicator(
      this.monitorManager,
      this.layoutHistoryRepository,
      {
        onLayoutApplied: (layoutId, monitorKey) => {
          this.mainPanel.updateSelectedLayoutHighlight(layoutId, monitorKey);
        },
      }
    );

    this.keyboardShortcutManager = new KeyboardShortcutManager(settings);

    this.mainPanel = new MainPanel(metadata, this.monitorManager, this.layoutHistoryRepository);
    this.mainPanel.setOnLayoutSelected((layout) => {
      this.applyLayoutToCurrentWindow(layout);
    });
    // Dynamic registration prevents shortcut conflicts when panel is hidden
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
    this.monitorManager.detectMonitors();

    this.monitorManager.connectToMonitorChanges(() => {
      // Re-render panel when monitors change to reflect new configuration
      if (this.mainPanel.isVisible()) {
        const cursor = this.getCursorPosition();
        const window = this.getCurrentWindow();
        this.mainPanel.show(cursor, window);
      }
    });

    this.dragSignalHandler.connect({
      onDragBegin: (window, op) => this.onGrabOpBegin(window, op),
      onDragEnd: (window, op) => this.onGrabOpEnd(window, op),
    });

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
   * Ensure layout history is loaded (lazy loading on first panel display)
   */
  private ensureHistoryLoaded(): void {
    if (!this.historyLoaded) {
      this.layoutHistoryRepository.load();
      this.historyLoaded = true;
    }
  }

  /**
   * Handle grab operation begin
   */
  private onGrabOpBegin(window: Meta.Window, op: Meta.GrabOp): void {
    if (op !== Meta.GrabOp.MOVING) {
      return;
    }

    this.currentWindow = window;
    this.lastDraggedWindow = window;
    this.isDragging = true;

    this.motionMonitor.start(() => {
      if (!this.isDragging) {
        return false;
      }
      this.onMotion();
      return true;
    });
  }

  /**
   * Handle grab operation end
   */
  private onGrabOpEnd(window: Meta.Window, op: Meta.GrabOp): void {
    if (op !== Meta.GrabOp.MOVING || window !== this.currentWindow) {
      return;
    }

    this.isDragging = false;
    this.currentWindow = null;
    this.isAtEdge = false;

    this.motionMonitor.stop();
    this.edgeTimerManager.clear();

    // Panel stays visible until user selects a layout
  }

  /**
   * Handle cursor motion during drag
   */
  private onMotion(): void {
    const cursor = this.getCursorPosition();
    const monitor = this.monitorManager.getCurrentMonitor();
    const atEdge = this.edgeDetector.isAtScreenEdge(cursor, monitor);

    if (atEdge && !this.isAtEdge) {
      this.isAtEdge = true;
      this.edgeTimerManager.start(() => {
        if (this.isAtEdge && this.isDragging) {
          this.showMainPanel();
        }
      });
    } else if (!atEdge && this.isAtEdge && !this.mainPanel.isVisible()) {
      this.isAtEdge = false;
      this.edgeTimerManager.clear();
    }
    // Keep isAtEdge=true while panel is visible to prevent accidental dismissal

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
      return;
    }

    this.ensureHistoryLoaded();

    const cursor = this.getCursorPosition();
    const window = this.getCurrentWindow();
    this.mainPanel.show(cursor, window);
  }

  /**
   * Apply layout to currently dragged window (called when panel button is clicked)
   */
  private applyLayoutToCurrentWindow(layout: Layout): void {
    // currentWindow is null after drag ends, so fallback to lastDraggedWindow
    const targetWindow = this.currentWindow || this.lastDraggedWindow;
    this.layoutApplicator.applyLayout(targetWindow, layout);
  }

  /**
   * Handle keyboard shortcut to show main panel
   */
  private onShowPanelShortcut(): void {
    log('[Controller] ===== KEYBOARD SHORTCUT TRIGGERED =====');

    if (this.mainPanel.isVisible()) {
      log('[Controller] Panel is already visible, hiding it');
      this.mainPanel.hide();
      return;
    }

    const focusWindow = global.display.get_focus_window();

    if (!focusWindow) {
      log('[Controller] No focused window, ignoring shortcut');
      return;
    }

    log(`[Controller] Focused window: ${focusWindow.get_title()}`);

    this.ensureHistoryLoaded();

    // Track window reference for layout application
    this.currentWindow = focusWindow;
    this.lastDraggedWindow = focusWindow;

    log('[Controller] Showing main panel...');
    this.mainPanel.showAtWindowCenter(focusWindow);
    log('[Controller] Main panel shown');
  }

  /**
   * Handle keyboard shortcut to hide main panel
   */
  private onHidePanelShortcut(): void {
    log('[Controller] ===== HIDE PANEL SHORTCUT TRIGGERED =====');

    if (this.mainPanel.isVisible()) {
      log('[Controller] Hiding panel');
      this.mainPanel.hide();
    } else {
      log('[Controller] Panel not visible, ignoring shortcut');
    }
  }
}
