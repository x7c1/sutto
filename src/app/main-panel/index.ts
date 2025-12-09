/// <reference path="../../types/gnome-shell-42.d.ts" />

/**
 * Main Panel
 *
 * Displays a panel with layout buttons for snapping windows to different positions.
 * The panel appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const Gio = imports.gi.Gio;

import { ExtensionSettings } from '../../settings/extension-settings';
import { AUTO_HIDE_DELAY_MS, DEFAULT_LAYOUT_SETTINGS, MINIATURE_DISPLAY_WIDTH } from '../constants';
import { getDebugConfig } from '../debug-panel/config';
import { importSettings, loadLayouts } from '../repository/layouts';
import type { Layout, Position } from '../types';
import { MainPanelAutoHide } from './auto-hide';
import { MainPanelDebugIntegration } from './debug-integration';
import { MainPanelKeyboardNavigator } from './keyboard-navigator';
import { MainPanelLayoutSelector } from './layout-selector';
import { MainPanelPositionManager } from './position-manager';
import type { PanelEventIds } from './renderer';
import {
  createBackground,
  createCategoriesView,
  createFooter,
  createPanelContainer,
} from './renderer';
import { MainPanelState } from './state';

declare function log(message: string): void;

export class MainPanel {
  private container: St.BoxLayout | null = null;
  private background: St.BoxLayout | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private rendererEventIds: PanelEventIds | null = null;
  private metadata: ExtensionMetadata;
  private onPanelShownCallback: (() => void) | null = null;
  private onPanelHiddenCallback: (() => void) | null = null;

  // Component instances
  private state: MainPanelState = new MainPanelState();
  private positionManager: MainPanelPositionManager = new MainPanelPositionManager();
  private layoutSelector: MainPanelLayoutSelector = new MainPanelLayoutSelector();
  private debugIntegration: MainPanelDebugIntegration = new MainPanelDebugIntegration();
  private autoHide: MainPanelAutoHide = new MainPanelAutoHide();
  private keyboardNavigator: MainPanelKeyboardNavigator = new MainPanelKeyboardNavigator();

  constructor(metadata: ExtensionMetadata) {
    this.metadata = metadata;
    // Setup auto-hide callback
    this.autoHide.setOnHide(() => {
      this.hide();
    });

    // Load extension settings for debug panel
    const extensionSettings = new ExtensionSettings(metadata);

    // Initialize debug integration
    this.debugIntegration.initialize(
      this.autoHide,
      () => {
        // Refresh panel when debug config changes
        // Use original cursor position (not adjusted position) to avoid shifting
        // Pass current window to preserve selection state
        if (this.container) {
          const cursor = this.state.getOriginalCursor();
          const window = this.state.getCurrentWindow();
          this.show(cursor, window);
        }
      },
      extensionSettings
    );

    // Initialize layouts repository
    // First launch: import default settings if repository is empty
    let layouts = loadLayouts();
    if (layouts.length === 0) {
      log('[MainPanel] Layouts repository is empty, importing default settings');
      importSettings(DEFAULT_LAYOUT_SETTINGS);
      layouts = loadLayouts();
    }

    // Filter out Test Layouts from base categories (they are added dynamically in debug mode)
    const baseCategories = layouts.filter((c) => c.name !== 'Test Layouts');
    this.state.setCategories(baseCategories);
  }

  /**
   * Set callback for when a layout is selected
   */
  setOnLayoutSelected(callback: (layout: Layout) => void): void {
    this.layoutSelector.setOnLayoutSelected(callback);
  }

  /**
   * Set callback for when panel is shown
   */
  setOnPanelShown(callback: () => void): void {
    this.onPanelShownCallback = callback;
  }

  /**
   * Set callback for when panel is hidden
   */
  setOnPanelHidden(callback: () => void): void {
    this.onPanelHiddenCallback = callback;
  }

  /**
   * Show the main panel at the specified position
   */
  show(cursor: Position, window: Meta.Window | null = null, centerVertically = false): void {
    // Hide existing panel if any
    this.hide();

    // Store original cursor position and window
    this.state.updateOriginalCursor(cursor);
    this.state.setCurrentWindow(window);

    // Reset auto-hide states
    this.autoHide.resetHoverStates();

    // Get debug configuration
    const debugConfig = this.debugIntegration.isEnabled() ? getDebugConfig() : null;

    // Get screen dimensions and calculate aspect ratio
    const screenWidth = global.screen_width;
    const screenHeight = global.screen_height;
    const aspectRatio = screenHeight / screenWidth;

    // Determine which categories to render (merge test categories if debug enabled)
    const baseCategories = this.state.getCategories();
    log(
      `[MainPanel] Base categories count: ${baseCategories.length}, items: ${baseCategories.map((c) => c.name).join(', ')}`
    );
    const categories = this.debugIntegration.mergeTestCategories(baseCategories);
    log(
      `[MainPanel] After merge categories count: ${categories.length}, items: ${categories.map((c) => c.name).join(', ')}`
    );

    // Calculate panel dimensions
    const showFooter = !debugConfig || debugConfig.showFooter;
    const panelDimensions = this.positionManager.calculatePanelDimensions(
      categories,
      aspectRatio,
      showFooter
    );
    this.state.setPanelDimensions(panelDimensions);

    // Adjust position for boundaries with center alignment
    const adjusted = this.positionManager.adjustPosition(
      cursor,
      panelDimensions,
      this.debugIntegration.isEnabled(),
      centerVertically
    );

    // Store adjusted panel position
    this.state.updatePanelPosition(adjusted);

    // Create background
    const { background, clickOutsideId } = createBackground(() => {
      this.hide();
    });
    this.background = background;

    // Create categories view or empty message
    let categoriesElement: St.BoxLayout | St.Label;
    let buttonEvents: PanelEventIds['buttonEvents'] = [];

    if (categories.length === 0) {
      // Show "No categories" message
      categoriesElement = new St.Label({
        text: 'No categories available',
        style: `
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          padding: 40px 60px;
        `,
        x_align: 2, // CENTER
      });
      this.layoutButtons.clear();
    } else {
      const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;
      const onLayoutSelected = this.layoutSelector.getOnLayoutSelected();
      const categoriesView = createCategoriesView(
        MINIATURE_DISPLAY_WIDTH,
        miniatureDisplayHeight,
        categories,
        debugConfig,
        window,
        (layout) => {
          if (onLayoutSelected) {
            onLayoutSelected(layout);
          }
        }
      );
      categoriesElement = categoriesView.categoriesContainer;
      buttonEvents = categoriesView.buttonEvents;
      this.layoutButtons = categoriesView.layoutButtons;
    }

    // Create footer with settings button
    const footer = createFooter(() => {
      log('[MainPanel] Settings button clicked');
      this.openPreferences();
      this.hide(); // Close panel after opening preferences
    });

    // Create main container
    const container = createPanelContainer();
    this.container = container;

    // Add children to container
    container.add_child(categoriesElement);
    if (!debugConfig || debugConfig.showFooter) {
      container.add_child(footer);
    }

    // Position panel at adjusted coordinates
    const position = this.state.getPanelPosition();
    container.set_position(position.x, position.y);

    // Add panel container to chrome
    Main.layoutManager.addChrome(container, {
      affectsInputRegion: true,
      trackFullscreen: false,
    });

    // Setup auto-hide
    this.autoHide.setupAutoHide(container, AUTO_HIDE_DELAY_MS);

    // Store event IDs for cleanup
    this.rendererEventIds = {
      clickOutsideId,
      buttonEvents: buttonEvents,
    };

    // Show debug panel if enabled - it will position itself relative to panel
    this.debugIntegration.showRelativeTo(position, panelDimensions);

    // Enable keyboard navigation
    const onLayoutSelected = this.layoutSelector.getOnLayoutSelected();
    if (this.container && onLayoutSelected) {
      this.keyboardNavigator.enable(this.container, this.layoutButtons, onLayoutSelected);
    }

    // Notify that panel is shown
    if (this.onPanelShownCallback) {
      this.onPanelShownCallback();
    }
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

      // Hide debug panel
      this.debugIntegration.hide();

      this.container = null;
      this.background = null;
      this.layoutButtons.clear();

      // Reset state (but keep currentWmClass and categories)
      this.state.reset();

      // Notify that panel is hidden
      if (this.onPanelHiddenCallback) {
        this.onPanelHiddenCallback();
      }
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
    const panelDimensions = this.state.getPanelDimensions();
    if (this.container && panelDimensions) {
      // Store original cursor position
      this.state.updateOriginalCursor(cursor);

      // Adjust position for boundaries with center alignment
      const adjusted = this.positionManager.adjustPosition(
        cursor,
        panelDimensions,
        this.debugIntegration.isEnabled()
      );

      // Update stored panel position
      this.state.updatePanelPosition(adjusted);

      // Update container position
      this.positionManager.updatePanelPosition(this.container, adjusted);

      // Update debug panel position if enabled - it will reposition itself relative to panel
      this.debugIntegration.showRelativeTo(adjusted, panelDimensions);
    }
  }

  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the panel
   */
  updateSelectedLayoutHighlight(newSelectedLayoutId: string): void {
    if (!this.container) {
      log('[MainPanel] Cannot update highlights: panel not visible');
      return;
    }

    this.layoutSelector.updateSelectedLayoutHighlight(newSelectedLayoutId, this.layoutButtons);
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
}
