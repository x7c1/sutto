/**
 * Main Panel
 *
 * Displays a panel with layout buttons for snapping windows to different positions.
 * The panel appears at the cursor position when the user drags a window to a screen edge.
 */

import type Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { Position, Size } from '../../domain/geometry/index.js';
import type {
  CollectionId,
  Layout,
  LayoutId,
  LayoutSelectedEvent,
  SpaceCollection,
  SpacesRow,
} from '../../domain/layout/index.js';
import type { DisabledReason } from '../../domain/licensing/index.js';
import { safeAddChrome } from '../../libs/shell/safe-add-chrome.js';
import type { LayoutHistoryRepository } from '../../operations/history/index.js';
import type { MonitorEnvironmentOperations } from '../../operations/monitor/index.js';
import { AUTO_HIDE_DELAY_MS, LOCKED_PANEL_HEIGHT, LOCKED_PANEL_WIDTH } from '../constants.js';
import { MainPanelAutoHide } from './auto-hide.js';
import { MainPanelKeyboardNavigator } from './keyboard-navigator.js';
import { LayoutButtonStyleUpdater } from './layout-button-style-updater.js';
import { MainPanelPositionManager } from './position-manager.js';
import type { PanelEventIds } from './renderer.js';
import {
  createBackground,
  createFooter,
  createLockedView,
  createPanelContainer,
  createSpacesRowView,
} from './renderer.js';
import { MainPanelState } from './state.js';

declare function log(message: string): void;

export interface MainPanelOptions {
  monitorEnvironment: MonitorEnvironmentOperations;
  layoutHistoryRepository: LayoutHistoryRepository;
  getActiveSpaceCollectionId: () => CollectionId | null;
  onLayoutSelected: (event: LayoutSelectedEvent) => void;
  getOpenPreferencesShortcuts: () => string[];
  ensurePresetForCurrentMonitors: () => void;
  getActiveSpaceCollection: (activeId: CollectionId | null) => SpaceCollection | undefined;
  onOpenPreferences: () => void;
  onPanelShown: () => void;
  onPanelHidden: () => void;
}

/** What the panel body renders: the layout picker, or a license-required notice. */
interface PanelBody {
  element: St.BoxLayout | St.Label;
  buttonEvents: PanelEventIds['buttonEvents'];
  /**
   * Rough size used to place the panel before it is rendered; the position is
   * corrected from the actual size once the container is on screen.
   */
  estimatedDimensions: Size;
}

function windowCenter(window: Meta.Window): Position {
  const frameRect = window.get_frame_rect();
  return {
    x: frameRect.x + frameRect.width / 2,
    y: frameRect.y + frameRect.height / 2,
  };
}

export class MainPanel {
  private container: St.BoxLayout | null = null;
  private background: St.BoxLayout | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private rendererEventIds: PanelEventIds | null = null;
  private readonly monitorEnvironment: MonitorEnvironmentOperations;
  private readonly layoutHistoryRepository: LayoutHistoryRepository;
  private readonly getActiveSpaceCollectionId: () => CollectionId | null;
  private readonly onLayoutSelected: (event: LayoutSelectedEvent) => void;
  private readonly getOpenPreferencesShortcuts: () => string[];
  private readonly ensurePresetForCurrentMonitors: () => void;
  private readonly getActiveSpaceCollection: (
    activeId: CollectionId | null
  ) => SpaceCollection | undefined;
  private readonly onOpenPreferences: () => void;
  private readonly onPanelShownCallback: () => void;
  private readonly onPanelHiddenCallback: () => void;

  // Component instances
  private state: MainPanelState = new MainPanelState();
  private positionManager: MainPanelPositionManager;
  private layoutButtonStyleUpdater: LayoutButtonStyleUpdater = new LayoutButtonStyleUpdater();
  private autoHide: MainPanelAutoHide = new MainPanelAutoHide();
  private keyboardNavigator: MainPanelKeyboardNavigator = new MainPanelKeyboardNavigator();

  constructor(options: MainPanelOptions) {
    this.monitorEnvironment = options.monitorEnvironment;
    this.layoutHistoryRepository = options.layoutHistoryRepository;
    this.getActiveSpaceCollectionId = options.getActiveSpaceCollectionId;
    this.onLayoutSelected = options.onLayoutSelected;
    this.getOpenPreferencesShortcuts = options.getOpenPreferencesShortcuts;
    this.ensurePresetForCurrentMonitors = options.ensurePresetForCurrentMonitors;
    this.getActiveSpaceCollection = options.getActiveSpaceCollection;
    this.onOpenPreferences = options.onOpenPreferences;
    this.onPanelShownCallback = options.onPanelShown;
    this.onPanelHiddenCallback = options.onPanelHidden;

    this.positionManager = new MainPanelPositionManager(this.monitorEnvironment);
    this.autoHide.setOnHide(() => {
      this.hide();
    });
  }

  /**
   * Show panel at window center position
   * Calculates the center position of the given window and shows the panel there
   */
  showAtWindowCenter(window: Meta.Window): void {
    // Show main panel at window center position with vertical centering
    this.show(windowCenter(window), window, true);
  }

  /**
   * Show the locked "license required" panel at the center of the given window
   */
  showLockedAtWindowCenter(reason: DisabledReason, window: Meta.Window): void {
    this.showLocked(reason, windowCenter(window), true);
  }

  /**
   * Show the main panel at the specified position
   */
  show(cursor: Position, window: Meta.Window | null = null, centerVertically = false): void {
    this.hide();
    this.prepareShow(cursor, window);
    this.present(this.createLayoutPickerBody(window), cursor, centerVertically);
  }

  /**
   * Show the main panel in its locked state at the specified position.
   *
   * The license is invalid, so the layout picker is replaced by an explanation
   * of what happened. Positioning and auto-hide behave exactly as in `show()`.
   */
  showLocked(reason: DisabledReason, cursor: Position, centerVertically = false): void {
    log(`[MainPanel] Showing locked panel: ${reason}`);
    this.hide();
    this.prepareShow(cursor, null);
    this.present(this.createLockedBody(reason), cursor, centerVertically);
  }

  /**
   * Hide the main panel
   */
  hide(): void {
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
  updateSelectedLayoutHighlight(newSelectedLayoutId: LayoutId, monitorKey: string): void {
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
   * Reset per-show state shared by every panel variant
   */
  private prepareShow(cursor: Position, window: Meta.Window | null): void {
    this.state.updateOriginalCursor(cursor);
    this.state.setCurrentWindow(window);
    this.autoHide.resetHoverStates();
  }

  /**
   * Build, position and wire up the panel around the given body.
   * Shared by every panel variant so they behave identically once shown.
   */
  private present(body: PanelBody, cursor: Position, centerVertically: boolean): void {
    this.state.setPanelDimensions(body.estimatedDimensions);

    const adjusted = this.positionManager.adjustPosition(
      cursor,
      body.estimatedDimensions,
      centerVertically
    );
    this.state.updatePanelPosition(adjusted);

    const { background, clickOutsideId } = createBackground(() => this.hide());
    this.background = background;

    const footer = createFooter(() => {
      log('[MainPanel] Settings button clicked');
      this.openPreferencesAndHide();
    });

    // Build and position container
    const container = createPanelContainer();
    this.container = container;
    container.add_child(body.element);
    container.add_child(footer);
    container.set_position(adjusted.x, adjusted.y);

    // Add to chrome and adjust for actual size
    // Shell 50's addChrome is not atomic; safeAddChrome destroys the actor
    // on failure so a future regression cannot leave an orphaned chrome
    // actor that captures pointer events session-wide.
    safeAddChrome(container, { trackFullscreen: false });
    this.adjustContainerPosition(container, cursor, body.estimatedDimensions, centerVertically);

    // Setup interactions
    this.setupPanelInteractions(container, clickOutsideId, body.buttonEvents);

    // Notify
    this.onPanelShownCallback();
  }

  private openPreferencesAndHide(): void {
    this.onOpenPreferences();
    this.hide();
  }

  /**
   * Build the normal panel body: the layout picker for the active SpaceCollection
   */
  private createLayoutPickerBody(window: Meta.Window | null): PanelBody {
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

    const { element, buttonEvents } = this.createRowsElement(rows, window);
    return {
      element,
      buttonEvents,
      estimatedDimensions: this.positionManager.calculatePanelDimensions(
        rows,
        true // showFooter
      ),
    };
  }

  /**
   * Build the locked panel body explaining why the extension is disabled
   */
  private createLockedBody(reason: DisabledReason): PanelBody {
    // No layout buttons in the locked state, so keyboard navigation has
    // nothing to move between.
    this.layoutButtons.clear();

    const { element, buttonEvents } = createLockedView(reason, () => this.openPreferencesAndHide());
    return {
      element,
      buttonEvents,
      estimatedDimensions: { width: LOCKED_PANEL_WIDTH, height: LOCKED_PANEL_HEIGHT },
    };
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
      this.monitorEnvironment.getMonitorsForRendering(maxDisplayCount);

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
      onOpenPreferences: () => this.openPreferencesAndHide(),
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
