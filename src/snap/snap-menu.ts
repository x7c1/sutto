/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with layout buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Main = imports.ui.main;

import { getDebugConfig } from './debug-config';
import { importSettings, loadLayouts } from './layouts-repository';
import { SnapMenuAutoHide } from './snap-menu-auto-hide';
import {
  AUTO_HIDE_DELAY_MS,
  DEFAULT_LAYOUT_SETTINGS,
  MINIATURE_DISPLAY_WIDTH,
} from './snap-menu-constants';
import { SnapMenuDebugIntegration } from './snap-menu-debug-integration';
import { SnapMenuLayoutSelector } from './snap-menu-layout-selector';
import { SnapMenuPositionManager } from './snap-menu-position-manager';
import type { MenuEventIds } from './snap-menu-renderer';
import {
  createBackground,
  createCategoriesView,
  createFooter,
  createMenuContainer,
} from './snap-menu-renderer';
import { SnapMenuState } from './snap-menu-state';
import type { Layout, LayoutGroup } from './types';

declare function log(message: string): void;

// Re-export types for backward compatibility
export type { Layout as SnapLayout, LayoutGroup as SnapLayoutGroup };

export class SnapMenu {
  private container: St.BoxLayout | null = null;
  private background: St.BoxLayout | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private rendererEventIds: MenuEventIds | null = null;

  // Component instances
  private state: SnapMenuState = new SnapMenuState();
  private positionManager: SnapMenuPositionManager = new SnapMenuPositionManager();
  private layoutSelector: SnapMenuLayoutSelector = new SnapMenuLayoutSelector();
  private debugIntegration: SnapMenuDebugIntegration = new SnapMenuDebugIntegration();
  private autoHide: SnapMenuAutoHide = new SnapMenuAutoHide();

  constructor() {
    // Setup auto-hide callback
    this.autoHide.setOnHide(() => {
      this.hide();
    });

    // Initialize debug integration
    this.debugIntegration.initialize(this.autoHide, () => {
      // Refresh menu when debug config changes
      // Use original cursor position (not adjusted position) to avoid shifting
      // Pass current wmClass to preserve selection state
      if (this.container) {
        const { x, y } = this.state.getOriginalCursor();
        const wmClass = this.state.getCurrentWmClass();
        this.show(x, y, wmClass);
      }
    });

    // Initialize layouts repository
    // First launch: import default settings if repository is empty
    let layouts = loadLayouts();
    if (layouts.length === 0) {
      log('[SnapMenu] Layouts repository is empty, importing default settings');
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
   * Show the snap menu at the specified position
   */
  show(x: number, y: number, wmClass: string | null = null): void {
    // Hide existing menu if any
    this.hide();

    // Store original cursor position and wmClass
    this.state.updateOriginalCursor(x, y);
    this.state.setCurrentWmClass(wmClass);

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
      `[SnapMenu] Base categories count: ${baseCategories.length}, items: ${baseCategories.map((c) => c.name).join(', ')}`
    );
    const categories = this.debugIntegration.mergeTestCategories(baseCategories);
    log(
      `[SnapMenu] After merge categories count: ${categories.length}, items: ${categories.map((c) => c.name).join(', ')}`
    );

    // Calculate menu dimensions
    const showFooter = !debugConfig || debugConfig.showFooter;
    const menuDimensions = this.positionManager.calculateMenuDimensions(
      categories,
      aspectRatio,
      showFooter
    );
    this.state.setMenuDimensions(menuDimensions);

    // Adjust position for boundaries with center alignment
    const adjusted = this.positionManager.adjustPosition(
      x,
      y,
      menuDimensions,
      this.debugIntegration.isEnabled()
    );

    // Store adjusted menu position
    this.state.updateMenuPosition(adjusted.x, adjusted.y);

    // Create background
    const { background, clickOutsideId } = createBackground(() => {
      this.hide();
    });
    this.background = background;

    // Create categories view or empty message
    let categoriesElement: St.BoxLayout | St.Label;
    let buttonEvents: MenuEventIds['buttonEvents'] = [];

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
        wmClass,
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

    // Create footer
    const footer = createFooter();

    // Create main container
    const container = createMenuContainer();
    this.container = container;

    // Add children to container
    container.add_child(categoriesElement);
    if (!debugConfig || debugConfig.showFooter) {
      container.add_child(footer);
    }

    // Position menu at adjusted coordinates
    const { x: menuX, y: menuY } = this.state.getMenuPosition();
    container.set_position(menuX, menuY);

    // Add menu container to chrome
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

    // Show debug panel if enabled - it will position itself relative to menu
    this.debugIntegration.showRelativeTo(menuX, menuY, menuDimensions.width, menuDimensions.height);
  }

  /**
   * Hide the snap menu
   */
  hide(): void {
    if (this.container) {
      // Cleanup auto-hide
      this.autoHide.cleanup();

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

      // Remove menu container
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
    }
  }

  /**
   * Check if menu is currently shown
   */
  isVisible(): boolean {
    return this.container !== null;
  }

  /**
   * Update menu position (for following cursor during drag)
   */
  updatePosition(x: number, y: number): void {
    const menuDimensions = this.state.getMenuDimensions();
    if (this.container && menuDimensions) {
      // Store original cursor position
      this.state.updateOriginalCursor(x, y);

      // Adjust position for boundaries with center alignment
      const adjusted = this.positionManager.adjustPosition(
        x,
        y,
        menuDimensions,
        this.debugIntegration.isEnabled()
      );

      // Update stored menu position
      this.state.updateMenuPosition(adjusted.x, adjusted.y);

      // Update container position
      this.positionManager.updateMenuPosition(this.container, adjusted.x, adjusted.y);

      // Update debug panel position if enabled - it will reposition itself relative to menu
      this.debugIntegration.showRelativeTo(
        adjusted.x,
        adjusted.y,
        menuDimensions.width,
        menuDimensions.height
      );
    }
  }

  /**
   * Get layout at the given position, or null if position is not over a layout button
   * If multiple layouts overlap at this position, returns the first one found
   */
  getLayoutAtPosition(x: number, y: number): Layout | null {
    if (!this.container) {
      return null;
    }

    return this.layoutSelector.getLayoutAtPosition(x, y, this.layoutButtons);
  }

  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the menu
   */
  updateSelectedLayoutHighlight(newSelectedLayoutId: string): void {
    if (!this.container) {
      log('[SnapMenu] Cannot update highlights: menu not visible');
      return;
    }

    this.layoutSelector.updateSelectedLayoutHighlight(newSelectedLayoutId, this.layoutButtons);
  }
}
