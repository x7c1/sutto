/**
 * Controller
 *
 * Main controller for Sutto extension.
 * Monitors window dragging and displays the main panel when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on panel buttons.
 *
 * DESIGN PRINCIPLES:
 * - Controller should NOT contain business logic - delegate to dedicated classes
 * - Controller's role is to coordinate between components and handle signals
 * - Keep methods thin - extract complex logic into XxxManager or XxxHandler classes
 * - Each responsibility should be handled by a single dedicated class
 */

import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';
import { EdgeDetector } from '../domain/geometry/index.js';
import type { LayoutSelectedEvent } from '../domain/layout/index.js';
import { extractLayoutIds } from '../domain/layout/index.js';
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
import type { LayoutHistoryRepository } from '../operations/history/index.js';
import { LicenseOperations } from '../operations/licensing/index.js';
import { MonitorEnvironmentOperations } from '../operations/monitor/index.js';
import { MainPanel } from '../ui/main-panel/index.js';
import {
  DragCoordinator,
  DragSignalHandler,
  EdgeTimerManager,
  MotionMonitor,
} from './drag/index.js';
import {
  resolvePresetGeneratorOperations,
  resolveSpaceCollectionOperations,
} from './factory/index.js';
import { LicenseStateHandler } from './licensing/index.js';
import { MonitorChangeHandler } from './monitor/index.js';
import { KeyboardShortcutManager } from './shortcuts/index.js';
import { LayoutApplicator } from './window/index.js';

declare function log(message: string): void;

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger panel
const EDGE_DELAY = 200; // milliseconds to wait before showing panel
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class Controller {
  private mainPanel: MainPanel;
  private monitorChangeHandler: MonitorChangeHandler;
  private licenseStateHandler: LicenseStateHandler;
  private dragCoordinator: DragCoordinator;
  private dragSignalHandler: DragSignalHandler;
  private keyboardShortcutManager: KeyboardShortcutManager;
  private layoutApplicator: LayoutApplicator;
  private layoutHistoryRepository: LayoutHistoryRepository;
  private historyLoaded: boolean = false;

  constructor(preferencesRepository: GSettingsPreferencesRepository, metadata: ExtensionMetadata) {
    const monitorProvider = new GnomeShellMonitorProvider();
    const monitorEnvironmentRepository = new FileMonitorEnvironmentRepository(
      getExtensionDataPath(MONITORS_FILE_NAME)
    );
    const monitorEnvironmentOperations = new MonitorEnvironmentOperations(
      monitorProvider,
      monitorEnvironmentRepository
    );

    // Lazy load to avoid I/O until panel is actually displayed
    this.layoutHistoryRepository = new FileLayoutHistoryRepository(
      getExtensionDataPath(HISTORY_FILE_NAME),
      this.getAllValidLayoutIds()
    );

    this.monitorChangeHandler = new MonitorChangeHandler(
      monitorProvider,
      monitorEnvironmentOperations,
      this.layoutHistoryRepository,
      {
        getActiveSpaceCollectionId: () => preferencesRepository.getActiveSpaceCollectionId(),
        setActiveSpaceCollectionId: (id) => preferencesRepository.setActiveSpaceCollectionId(id),
      }
    );

    this.dragCoordinator = new DragCoordinator(
      new MotionMonitor(MONITOR_INTERVAL),
      new EdgeTimerManager(EDGE_DELAY),
      new EdgeDetector(EDGE_THRESHOLD),
      monitorProvider,
      {
        onEdgeTimerFired: () => this.showMainPanel(),
        onPanelPositionUpdate: (cursor) => this.mainPanel.updatePosition(cursor),
        isPanelVisible: () => this.mainPanel.isVisible(),
      }
    );

    this.dragSignalHandler = new DragSignalHandler();

    this.layoutApplicator = new LayoutApplicator(monitorProvider, this.layoutHistoryRepository, {
      onLayoutApplied: (layoutId, monitorKey) => {
        this.mainPanel.updateSelectedLayoutHighlight(layoutId, monitorKey);
      },
    });

    this.keyboardShortcutManager = new KeyboardShortcutManager(preferencesRepository);

    // Initialize license management
    const licenseRepository = new GSettingsLicenseRepository(preferencesRepository.getGSettings());
    const licenseApiClient = new HttpLicenseApiClient(__LICENSE_API_BASE_URL__);
    const licenseOperations = new LicenseOperations(
      licenseRepository,
      licenseApiClient,
      new GLibDateProvider(),
      new GioNetworkStateProvider(),
      new SystemDeviceInfoProvider()
    );
    this.licenseStateHandler = new LicenseStateHandler(licenseOperations);

    this.mainPanel = new MainPanel({
      metadata,
      monitorEnvironment: monitorEnvironmentOperations,
      layoutHistoryRepository: this.layoutHistoryRepository,
      onLayoutSelected: (event) => this.applyLayoutToCurrentWindow(event),
      getOpenPreferencesShortcuts: () => preferencesRepository.getOpenPreferencesShortcut(),
      getActiveSpaceCollectionId: () => preferencesRepository.getActiveSpaceCollectionId(),
      ensurePresetForCurrentMonitors: () =>
        resolvePresetGeneratorOperations().ensurePresetForCurrentMonitors(),
      getActiveSpaceCollection: (activeId) =>
        resolveSpaceCollectionOperations().getActiveSpaceCollection(activeId),
      onPanelShown: () =>
        this.keyboardShortcutManager.registerHidePanelShortcut(() => this.onHidePanelShortcut()),
      onPanelHidden: () => this.keyboardShortcutManager.unregisterHidePanelShortcut(),
    });
  }

  enable(): void {
    this.licenseStateHandler.initialize(() => {
      log('[Controller] License invalid, hiding panel');
      this.mainPanel.hide();
    });

    this.monitorChangeHandler.initialize();

    this.monitorChangeHandler.connectToMonitorChanges(() => {
      if (this.mainPanel.isVisible()) {
        const cursor = this.getCursorPosition();
        const window = this.dragCoordinator.getCurrentWindow();
        this.mainPanel.show(cursor, window);
      }
    });

    this.dragSignalHandler.connect({
      onDragBegin: (window, op) => this.dragCoordinator.onGrabOpBegin(window, op),
      onDragEnd: (window, op) => this.dragCoordinator.onGrabOpEnd(window, op),
    });

    this.keyboardShortcutManager.registerShowPanelShortcut(() => this.onShowPanelShortcut());
  }

  disable(): void {
    this.licenseStateHandler.clearCallbacks();
    this.dragCoordinator.stop();
    this.dragSignalHandler.disconnect();
    this.keyboardShortcutManager.unregisterAll();
    this.monitorChangeHandler.disconnectMonitorChanges();
  }

  private ensureHistoryLoaded(): void {
    if (!this.historyLoaded) {
      this.layoutHistoryRepository.restoreHistory();
      this.historyLoaded = true;
    }
    this.monitorChangeHandler.syncActiveCollectionToHistory();
  }

  private getAllValidLayoutIds(): Set<string> {
    const collections = resolveSpaceCollectionOperations().loadAllCollections();
    return extractLayoutIds(collections);
  }

  private getCursorPosition(): { x: number; y: number } {
    const [x, y] = global.get_pointer();
    return { x, y };
  }

  private showMainPanel(): void {
    if (!this.licenseStateHandler.isValid()) {
      log('[Controller] Cannot show panel: license invalid');
      return;
    }

    if (this.mainPanel.isVisible()) {
      return;
    }

    this.ensureHistoryLoaded();
    this.monitorChangeHandler.detectAndActivate();

    const cursor = this.getCursorPosition();
    const window = this.dragCoordinator.getCurrentWindow();
    this.mainPanel.show(cursor, window);
  }

  private applyLayoutToCurrentWindow(event: LayoutSelectedEvent): void {
    const targetWindow = this.dragCoordinator.getCurrentWindow();
    if (!targetWindow) {
      log('[Controller] No window to apply layout to');
      return;
    }
    this.layoutApplicator.applyLayout(targetWindow, event);
  }

  private onShowPanelShortcut(): void {
    log('[Controller] ===== KEYBOARD SHORTCUT TRIGGERED =====');

    if (!this.licenseStateHandler.isValid()) {
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

    this.dragCoordinator.setCurrentWindow(focusWindow);

    log('[Controller] Showing main panel...');
    this.mainPanel.showAtWindowCenter(focusWindow);
    log('[Controller] Main panel shown');
  }

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
