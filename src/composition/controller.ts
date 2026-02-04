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
import { EdgeDetector, type Position } from '../domain/geometry/index.js';
import type { LayoutSelectedEvent } from '../domain/layout/index.js';
import { CollectionId, extractLayoutIds } from '../domain/layout/index.js';
import { HttpLicenseApiClient } from '../infra/api/index.js';
import { HISTORY_FILE_NAME, MONITORS_FILE_NAME } from '../infra/constants.js';
import {
  FileLayoutHistoryRepository,
  FileMonitorEnvironmentRepository,
  getExtensionDataPath,
} from '../infra/file/index.js';
import {
  GioNetworkStateProvider,
  GLibDateProvider,
  GSettingsLicenseRepository,
  type GSettingsPreferencesRepository,
  SystemDeviceInfoProvider,
} from '../infra/glib/index.js';
import { GnomeShellMonitorProvider } from '../infra/monitor/gnome-shell-monitor-provider.js';
import { MainPanel } from '../ui/main-panel/index.js';
import type { LayoutHistoryRepository } from '../usecase/history/index.js';
import { LicenseUsecase } from '../usecase/licensing/index.js';
import { MonitorEnvironmentUsecase } from '../usecase/monitor/index.js';
import { DragSignalHandler, EdgeTimerManager, MotionMonitor } from './drag/index.js';
import { resolvePresetGeneratorUsecase, resolveSpaceCollectionUsecase } from './factory/index.js';
import { KeyboardShortcutManager } from './shortcuts/index.js';
import { LayoutApplicator } from './window/index.js';

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
  private monitorProvider: GnomeShellMonitorProvider;
  private monitorEnvironmentUsecase: MonitorEnvironmentUsecase;
  private edgeDetector: EdgeDetector;
  private edgeTimerManager: EdgeTimerManager;
  private motionMonitor: MotionMonitor;
  private layoutApplicator: LayoutApplicator;
  private keyboardShortcutManager: KeyboardShortcutManager;
  private dragSignalHandler: DragSignalHandler;
  private layoutHistoryRepository: LayoutHistoryRepository;
  private historyLoaded: boolean = false;
  private preferencesRepository: GSettingsPreferencesRepository;
  private licenseUsecase: LicenseUsecase;
  private isLicenseValid: boolean = true;

  constructor(preferencesRepository: GSettingsPreferencesRepository, metadata: ExtensionMetadata) {
    this.preferencesRepository = preferencesRepository;
    this.monitorProvider = new GnomeShellMonitorProvider();
    const monitorEnvironmentRepository = new FileMonitorEnvironmentRepository(
      getExtensionDataPath(MONITORS_FILE_NAME)
    );
    this.monitorEnvironmentUsecase = new MonitorEnvironmentUsecase(
      this.monitorProvider,
      monitorEnvironmentRepository
    );

    // Lazy load to avoid I/O until panel is actually displayed
    this.layoutHistoryRepository = new FileLayoutHistoryRepository(
      getExtensionDataPath(HISTORY_FILE_NAME),
      this.getAllValidLayoutIds()
    );

    this.edgeDetector = new EdgeDetector(EDGE_THRESHOLD);
    this.edgeTimerManager = new EdgeTimerManager(EDGE_DELAY);
    this.motionMonitor = new MotionMonitor(MONITOR_INTERVAL);
    this.dragSignalHandler = new DragSignalHandler();

    this.layoutApplicator = new LayoutApplicator(
      this.monitorProvider,
      this.layoutHistoryRepository,
      {
        onLayoutApplied: (layoutId, monitorKey) => {
          this.mainPanel.updateSelectedLayoutHighlight(layoutId, monitorKey);
        },
      }
    );

    this.keyboardShortcutManager = new KeyboardShortcutManager(preferencesRepository);

    // Initialize license management
    const licenseRepository = new GSettingsLicenseRepository(preferencesRepository.getGSettings());
    const licenseApiClient = new HttpLicenseApiClient(__LICENSE_API_BASE_URL__);
    this.licenseUsecase = new LicenseUsecase(
      licenseRepository,
      licenseApiClient,
      new GLibDateProvider(),
      new GioNetworkStateProvider(),
      new SystemDeviceInfoProvider()
    );
    this.licenseUsecase.onStateChange(() => {
      this.isLicenseValid = this.licenseUsecase.shouldExtensionBeEnabled();
      if (!this.isLicenseValid) {
        log('[Controller] License invalid, hiding panel');
        this.mainPanel.hide();
      }
    });

    this.mainPanel = new MainPanel({
      metadata,
      monitorEnvironment: this.monitorEnvironmentUsecase,
      layoutHistoryRepository: this.layoutHistoryRepository,
      onLayoutSelected: (event) => this.applyLayoutToCurrentWindow(event),
      getOpenPreferencesShortcuts: () => preferencesRepository.getOpenPreferencesShortcut(),
      getActiveSpaceCollectionId: () => preferencesRepository.getActiveSpaceCollectionId(),
      ensurePresetForCurrentMonitors: () =>
        resolvePresetGeneratorUsecase().ensurePresetForCurrentMonitors(),
      getActiveSpaceCollection: (activeId) =>
        resolveSpaceCollectionUsecase().getActiveSpaceCollection(activeId),
      onPanelShown: () =>
        this.keyboardShortcutManager.registerHidePanelShortcut(() => this.onHidePanelShortcut()),
      onPanelHidden: () => this.keyboardShortcutManager.unregisterHidePanelShortcut(),
    });
  }

  /**
   * Enable the controller
   */
  enable(): void {
    // Initialize license checking
    this.licenseUsecase.initialize().then(() => {
      this.isLicenseValid = this.licenseUsecase.shouldExtensionBeEnabled();
      if (!this.isLicenseValid) {
        log('[Controller] License invalid on startup, extension disabled');
      }
    });

    // Sync current active collection from settings
    const currentCollectionId = this.preferencesRepository.getActiveSpaceCollectionId();
    if (currentCollectionId) {
      this.monitorEnvironmentUsecase.setActiveCollectionId(currentCollectionId);
    }

    // Detect monitors and save environment
    this.handleMonitorsSaveResult(this.monitorEnvironmentUsecase.detectAndSaveMonitors());

    this.monitorProvider.connectToMonitorChanges(() => {
      const collectionToActivate = this.monitorEnvironmentUsecase.detectAndSaveMonitors();
      this.handleMonitorsSaveResult(collectionToActivate);

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
    this.licenseUsecase.clearCallbacks();
    this.motionMonitor.stop();
    this.dragSignalHandler.disconnect();
    this.keyboardShortcutManager.unregisterAll();
    this.edgeTimerManager.clear();
    this.resetState();
    this.monitorProvider.disconnectMonitorChanges();
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
   * Handle result from saveMonitors - activate collection if environment changed
   */
  private handleMonitorsSaveResult(collectionToActivate: string | null): void {
    if (collectionToActivate) {
      log(`[Controller] Environment changed, activating collection: ${collectionToActivate}`);
      this.preferencesRepository.setActiveSpaceCollectionId(collectionToActivate);
      this.monitorEnvironmentUsecase.setActiveCollectionId(collectionToActivate);
      this.syncActiveCollectionToHistory();
    }
  }

  /**
   * Ensure layout history is loaded (lazy loading on first panel display)
   */
  private ensureHistoryLoaded(): void {
    if (!this.historyLoaded) {
      this.layoutHistoryRepository.restoreHistory();
      this.historyLoaded = true;
    }
    this.syncActiveCollectionToHistory();
  }

  private syncActiveCollectionToHistory(): void {
    const collectionIdStr = this.preferencesRepository.getActiveSpaceCollectionId();
    if (collectionIdStr) {
      const collectionId = new CollectionId(collectionIdStr);
      this.layoutHistoryRepository.setActiveCollection(collectionId);
    }
  }

  /**
   * Get all valid layout IDs from all collections
   */
  private getAllValidLayoutIds(): Set<string> {
    const collections = resolveSpaceCollectionUsecase().loadAllCollections();
    return extractLayoutIds(collections);
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
    const monitor = this.monitorProvider.getCurrentMonitor();
    const atEdge = monitor ? this.edgeDetector.isAtEdge(cursor, monitor.geometry) : false;

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
    if (!this.isLicenseValid) {
      log('[Controller] Cannot show panel: license invalid');
      return;
    }

    if (this.mainPanel.isVisible()) {
      return;
    }

    this.ensureHistoryLoaded();
    this.handleMonitorsSaveResult(this.monitorEnvironmentUsecase.detectAndSaveMonitors());

    const cursor = this.getCursorPosition();
    const window = this.getCurrentWindow();
    this.mainPanel.show(cursor, window);
  }

  /**
   * Apply layout to currently dragged window (called when panel button is clicked)
   */
  private applyLayoutToCurrentWindow(event: LayoutSelectedEvent): void {
    // currentWindow is null after drag ends, so fallback to lastDraggedWindow
    const targetWindow = this.currentWindow || this.lastDraggedWindow;
    if (!targetWindow) {
      log('[Controller] No window to apply layout to');
      return;
    }
    this.layoutApplicator.applyLayout(targetWindow, event);
  }

  /**
   * Handle keyboard shortcut to show main panel
   */
  private onShowPanelShortcut(): void {
    log('[Controller] ===== KEYBOARD SHORTCUT TRIGGERED =====');

    if (!this.isLicenseValid) {
      log('[Controller] License invalid, ignoring shortcut');
      return;
    }

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
