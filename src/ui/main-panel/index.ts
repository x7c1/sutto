/**
 * Main Panel
 *
 * Displays a panel with layout buttons for snapping windows to different positions.
 * The panel appears at the cursor position when the user drags a window to a screen edge.
 */

import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import St from 'gi://St';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { Position, Size } from '../../domain/geometry/index.js';
import type {
  Layout,
  LayoutSelectedEvent,
  SpaceCollection,
  SpacesRow,
} from '../../domain/layout/index.js';
import type { LayoutHistoryRepository } from '../../usecase/history/index.js';
import type { MonitorProvider } from '../../usecase/monitor/index.js';
import { AUTO_HIDE_DELAY_MS } from '../constants.js';
import { MainPanelAutoHide } from './auto-hide.js';
import { MainPanelKeyboardNavigator } from './keyboard-navigator.js';
import { LayoutButtonStyleUpdater } from './layout-button-style-updater.js';
import { MainPanelPositionManager } from './position-manager.js';
import type { PanelEventIds } from './renderer.js';
import {
  createBackground,
  createFooter,
  createPanelContainer,
  createSpacesRowView,
} from './renderer.js';
import { MainPanelState } from './state.js';

declare function log(message: string): void;

export interface MainPanelOptions {
  metadata: ExtensionMetadata;
  monitorProvider: MonitorProvider;
  layoutHistoryRepository: LayoutHistoryRepository;
  getActiveSpaceCollectionId: () => string;
  onLayoutSelected: (event: LayoutSelectedEvent) => void;
  getOpenPreferencesShortcuts: () => string[];
  ensurePresetForCurrentMonitors: () => void;
  getActiveSpaceCollection: (activeId: string) => SpaceCollection | undefined;
  onPanelShown: () => void;
  onPanelHidden: () => void;
}

export class MainPanel {
  private container: St.BoxLayout | null = null;
  private background: St.BoxLayout | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private rendererEventIds: PanelEventIds | null = null;
  private readonly metadata: ExtensionMetadata;
  private readonly monitorProvider: MonitorProvider;
  private readonly layoutHistoryRepository: LayoutHistoryRepository;
  private readonly getActiveSpaceCollectionId: () => string;
  private readonly onLayoutSelected: (event: LayoutSelectedEvent) => void;
  private readonly getOpenPreferencesShortcuts: () => string[];
  private readonly ensurePresetForCurrentMonitors: () => void;
  private readonly getActiveSpaceCollection: (activeId: string) => SpaceCollection | undefined;
  private readonly onPanelShownCallback: () => void;
  private readonly onPanelHiddenCallback: () => void;

  // Component instances
  private state: MainPanelState = new MainPanelState();
  private positionManager: MainPanelPositionManager;
  private layoutButtonStyleUpdater: LayoutButtonStyleUpdater = new LayoutButtonStyleUpdater();
  private autoHide: MainPanelAutoHide = new MainPanelAutoHide();
  private keyboardNavigator: MainPanelKeyboardNavigator = new MainPanelKeyboardNavigator();

  constructor(options: MainPanelOptions) {
    this.metadata = options.metadata;
    this.monitorProvider = options.monitorProvider;
    this.layoutHistoryRepository = options.layoutHistoryRepository;
    this.getActiveSpaceCollectionId = options.getActiveSpaceCollectionId;
    this.onLayoutSelected = options.onLayoutSelected;
    this.getOpenPreferencesShortcuts = options.getOpenPreferencesShortcuts;
    this.ensurePresetForCurrentMonitors = options.ensurePresetForCurrentMonitors;
    this.getActiveSpaceCollection = options.getActiveSpaceCollection;
    this.onPanelShownCallback = options.onPanelShown;
    this.onPanelHiddenCallback = options.onPanelHidden;

    this.positionManager = new MainPanelPositionManager(this.monitorProvider);
    this.autoHide.setOnHide(() => {
      this.hide();
    });
  }

  /**
   * Show panel at window center position
   * Calculates the center position of the given window and shows the panel there
   */
  showAtWindowCenter(window: Meta.Window): void {
    // Get window frame rectangle to position panel at window center
    const frameRect = window.get_frame_rect();
    const windowCenter: Position = {
      x: frameRect.x + frameRect.width / 2,
      y: frameRect.y + frameRect.height / 2,
    };

    // Show main panel at window center position with vertical centering
    this.show(windowCenter, window, true);
  }

  /**
   * Show the main panel at the specified position
   */
  show(cursor: Position, window: Meta.Window | null = null, centerVertically = false): void {
    this.hide();

    // Initialize state
    this.state.updateOriginalCursor(cursor);
    this.state.setCurrentWindow(window);
    this.autoHide.resetHoverStates();

    // Ensure preset exists for current monitor count
    this.ensurePresetForCurrentMonitors();

    // Load active SpaceCollection and filter disabled Spaces
    const activeId = this.getActiveSpaceCollectionId();
    const activeCollection = this.getActiveSpaceCollection(activeId);
    const allRows = activeCollection?.rows ?? [];
    const rows = this.filterEnabledSpaces(allRows);
    this.state.setSpacesRows(rows);
    log(
      `[MainPanel] Using SpaceCollection: ${activeCollection?.name ?? 'none'}, rows: ${rows.length} (filtered from ${allRows.length})`
    );

    const panelDimensions = this.positionManager.calculatePanelDimensions(
      rows,
      true // showFooter
    );
    this.state.setPanelDimensions(panelDimensions);

    const adjusted = this.positionManager.adjustPosition(cursor, panelDimensions, centerVertically);
    this.state.updatePanelPosition(adjusted);

    // Create UI elements
    const { background, clickOutsideId } = createBackground(() => this.hide());
    this.background = background;

    const { element: rowsElement, buttonEvents } = this.createRowsElement(rows, window);

    const footer = createFooter(() => {
      log('[MainPanel] Settings button clicked');
      this.openPreferences();
      this.hide();
    });

    // Build and position container
    const container = createPanelContainer();
    this.container = container;
    container.add_child(rowsElement);
    container.add_child(footer);
    container.set_position(adjusted.x, adjusted.y);

    // Add to chrome and adjust for actual size
    Main.layoutManager.addChrome(container, {
      affectsInputRegion: true,
      trackFullscreen: false,
    });
    this.adjustContainerPosition(container, cursor, panelDimensions, centerVertically);

    // Setup interactions
    this.setupPanelInteractions(container, clickOutsideId, buttonEvents);

    // Notify
    this.onPanelShownCallback();
  }

  /**
   * Hide the main panel
   */
  hide(): void {
    // Reset cursor to default when hiding panel
    global.display.set_cursor(Meta.Cursor.DEFAULT);

    if (this.container) {
      // Cleanup auto-hide
      this.autoHide.cleanup();

      // Disable keyboard navigation
      this.keyboardNavigator.disable();

      // Disconnect event handlers
      if (this.rendererEventIds) {
        // Disconnect background click event
        if (this.background) {
          this.background.disconnect(this.rendererEventIds.clickOutsideId);
        }

        // Disconnect button events
        for (const { button, enterEventId, leaveEventId, clickEventId } of this.rendererEventIds
          .buttonEvents) {
          button.disconnect(enterEventId);
          button.disconnect(leaveEventId);
          button.disconnect(clickEventId);
        }

        this.rendererEventIds = null;
      }

      // Remove panel container
      Main.layoutManager.removeChrome(this.container);
      this.container.destroy();

      // Remove background
      if (this.background) {
        Main.layoutManager.removeChrome(this.background);
        this.background.destroy();
      }

      this.container = null;
      this.background = null;
      this.layoutButtons.clear();

      // Reset state (but keep currentWmClass and spacesRows)
      this.state.reset();

      // Notify that panel is hidden
      this.onPanelHiddenCallback();
    }
  }

  /**
   * Check if panel is currently shown
   */
  isVisible(): boolean {
    return this.container !== null;
  }

  /**
   * Update panel position (for following cursor during drag)
   */
  updatePosition(cursor: Position): void {
    if (this.container) {
      // Use actual container size instead of calculated size
      const actualWidth = this.container.get_width();
      const actualHeight = this.container.get_height();
      const actualDimensions = { width: actualWidth, height: actualHeight };

      // Store original cursor position
      this.state.updateOriginalCursor(cursor);

      // Adjust position for boundaries using actual size
      const adjusted = this.positionManager.adjustPosition(cursor, actualDimensions);

      // Update stored panel position
      this.state.updatePanelPosition(adjusted);

      // Update container position
      this.positionManager.updatePanelPosition(this.container, adjusted);
    }
  }

  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the panel
   * Only updates buttons for the specified monitor
   */
  updateSelectedLayoutHighlight(newSelectedLayoutId: string, monitorKey: string): void {
    if (!this.container) {
      log('[MainPanel] Cannot update highlights: panel not visible');
      return;
    }

    this.layoutButtonStyleUpdater.updateSelectedLayoutHighlight(
      newSelectedLayoutId,
      monitorKey,
      this.layoutButtons
    );
  }

  /**
   * Open preferences window
   */
  private openPreferences(): void {
    // Use actual UUID from metadata (supports reloader suffix in development mode)
    const uuid = this.metadata.uuid;
    log(`[MainPanel] Opening preferences for UUID: ${uuid}`);

    // Try multiple methods to open preferences
    const commands = [
      // GNOME 42+ command
      ['gnome-extensions', 'prefs', uuid],
      // Legacy command for older GNOME versions
      ['gnome-shell-extension-prefs', uuid],
    ];

    let success = false;
    for (const cmd of commands) {
      try {
        Gio.Subprocess.new(cmd, Gio.SubprocessFlags.NONE);
        log(`[MainPanel] Opening preferences with: ${cmd.join(' ')}`);
        success = true;
        break;
      } catch (e) {
        log(`[MainPanel] Failed with ${cmd[0]}: ${e}`);
      }
    }

    if (!success) {
      log('[MainPanel] ERROR: Could not open preferences with any method');
      log('[MainPanel] Please open preferences manually from Extensions app');
    }
  }

  /**
   * Create spaces rows element or empty message
   */
  private createRowsElement(
    rows: SpacesRow[],
    window: Meta.Window | null
  ): {
    element: St.BoxLayout | St.Label;
    buttonEvents: PanelEventIds['buttonEvents'];
  } {
    if (rows.length === 0) {
      const element = new St.Label({
        text: 'No spaces available',
        style: `
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          padding: 40px 60px;
        `,
        x_align: 2, // CENTER
      });
      this.layoutButtons.clear();
      return { element, buttonEvents: [] };
    }

    // Get the max display count from rows to find appropriate monitors
    let maxDisplayCount = 0;
    for (const row of rows) {
      for (const space of row.spaces) {
        const displayCount = Object.keys(space.displays).length;
        maxDisplayCount = Math.max(maxDisplayCount, displayCount);
      }
    }

    // Get monitors for rendering (may include data from different environment)
    const { monitors, inactiveMonitorKeys } =
      this.monitorProvider.getMonitorsForRendering(maxDisplayCount);

    const rowsView = createSpacesRowView(
      monitors,
      rows,
      window,
      (event) => this.onLayoutSelected(event),
      this.layoutHistoryRepository,
      inactiveMonitorKeys
    );

    this.layoutButtons = rowsView.layoutButtons;
    return {
      element: rowsView.rowsContainer,
      buttonEvents: rowsView.buttonEvents,
    };
  }

  /**
   * Setup event handlers and keyboard navigation
   */
  private setupPanelInteractions(
    container: St.BoxLayout,
    clickOutsideId: number,
    buttonEvents: PanelEventIds['buttonEvents']
  ): void {
    // Setup auto-hide
    this.autoHide.setupAutoHide(container, AUTO_HIDE_DELAY_MS);

    // Store event IDs for cleanup
    this.rendererEventIds = {
      clickOutsideId,
      buttonEvents,
    };

    // Enable keyboard navigation
    this.keyboardNavigator.enable({
      container,
      layoutButtons: this.layoutButtons,
      onLayoutSelected: (event) => this.onLayoutSelected(event),
      onOpenPreferences: () => {
        this.openPreferences();
        this.hide();
      },
      openPreferencesShortcuts: this.getOpenPreferencesShortcuts(),
    });
  }

  /**
   * Adjust container position using actual size after rendering
   */
  private adjustContainerPosition(
    container: St.BoxLayout,
    cursor: Position,
    panelDimensions: Size,
    centerVertically: boolean
  ): void {
    const actualWidth = container.get_width();
    const actualHeight = container.get_height();

    if (actualWidth !== panelDimensions.width || actualHeight !== panelDimensions.height) {
      const actualDimensions = { width: actualWidth, height: actualHeight };
      const reposition = this.positionManager.adjustPosition(
        cursor,
        actualDimensions,
        centerVertically
      );
      container.set_position(reposition.x, reposition.y);
      this.state.updatePanelPosition(reposition);
      this.state.setPanelDimensions(actualDimensions);
    }
  }

  /**
   * Filter SpacesRows to include only enabled Spaces
   * Removes rows where all Spaces are disabled
   */
  private filterEnabledSpaces(rows: SpacesRow[]): SpacesRow[] {
    return rows
      .map((row) => ({
        spaces: row.spaces.filter((space) => space.enabled !== false),
      }))
      .filter((row) => row.spaces.length > 0);
  }
}
