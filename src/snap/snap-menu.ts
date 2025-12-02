/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with layout buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Main = imports.ui.main;

import { getDebugConfig, isDebugMode, loadDebugConfig } from './debug-config';
import { DebugPanel } from './debug-panel';
import { adjustMenuPosition } from './positioning';
import { SnapMenuAutoHide } from './snap-menu-auto-hide';
import {
  AUTO_HIDE_DELAY_MS,
  CATEGORY_SPACING,
  DEFAULT_CATEGORIES,
  DISPLAY_SPACING,
  DISPLAY_SPACING_HORIZONTAL,
  FOOTER_MARGIN_TOP,
  MAX_DISPLAYS_PER_ROW,
  MENU_BG_COLOR,
  MENU_BORDER_COLOR,
  MENU_EDGE_PADDING,
  MENU_PADDING,
  MINIATURE_DISPLAY_WIDTH,
} from './snap-menu-constants';
import type { MenuEventIds } from './snap-menu-renderer';
import { createBackground, createCategoriesView, createFooter } from './snap-menu-renderer';
import { getTestLayoutGroups } from './test-layouts';
import type { Layout, LayoutGroup, LayoutGroupCategory } from './types';

declare function log(message: string): void;

// Re-export types for backward compatibility
export type { Layout as SnapLayout, LayoutGroup as SnapLayoutGroup };

export class SnapMenu {
  private container: St.BoxLayout | null = null;
  private background: St.BoxLayout | null = null;
  private categories: LayoutGroupCategory[] = [];
  private onLayoutSelected: ((layout: Layout) => void) | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private rendererEventIds: MenuEventIds | null = null;
  private autoHide: SnapMenuAutoHide = new SnapMenuAutoHide();
  private debugPanel: DebugPanel | null = null;
  private menuX: number = 0; // Adjusted menu position
  private menuY: number = 0; // Adjusted menu position
  private originalCursorX: number = 0; // Original cursor X position (before adjustment)
  private originalCursorY: number = 0; // Original cursor Y position (before adjustment)
  private menuDimensions: { width: number; height: number } | null = null;

  constructor() {
    // Setup auto-hide callback
    this.autoHide.setOnHide(() => {
      this.hide();
    });

    // Initialize debug mode if enabled
    if (isDebugMode()) {
      log('[SnapMenu] Debug mode is enabled, initializing debug panel');
      loadDebugConfig();
      this.debugPanel = new DebugPanel();
      this.debugPanel.setOnConfigChanged(() => {
        // Refresh menu when debug config changes
        // Use original cursor position (not adjusted position) to avoid shifting
        if (this.container) {
          this.show(this.originalCursorX, this.originalCursorY);
        }
      });
      this.debugPanel.setOnEnter(() => {
        this.autoHide.setDebugPanelHovered(true, AUTO_HIDE_DELAY_MS);
      });
      this.debugPanel.setOnLeave(() => {
        this.autoHide.setDebugPanelHovered(false, AUTO_HIDE_DELAY_MS);
      });
    } else {
      log('[SnapMenu] Debug mode is disabled');
    }

    // Initialize with default categories
    this.categories = DEFAULT_CATEGORIES;
  }

  /**
   * Set callback for when a layout is selected
   */
  setOnLayoutSelected(callback: (layout: Layout) => void): void {
    this.onLayoutSelected = callback;
  }

  /**
   * Show the snap menu at the specified position
   */
  show(x: number, y: number): void {
    // Hide existing menu if any
    this.hide();

    // Store original cursor position (before any adjustments)
    this.originalCursorX = x;
    this.originalCursorY = y;

    // Reset auto-hide states
    this.autoHide.resetHoverStates();

    // Get debug configuration
    const debugConfig = this.debugPanel ? getDebugConfig() : null;

    // Get screen dimensions and calculate aspect ratio
    const screenWidth = global.screen_width;
    const screenHeight = global.screen_height;
    const aspectRatio = screenHeight / screenWidth;
    const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;

    // Determine which categories to render
    let categories = this.categories;
    if (this.debugPanel && debugConfig) {
      const testGroups = getTestLayoutGroups();
      const enabledTestGroups = testGroups.filter((g) => debugConfig.enabledTestGroups.has(g.name));
      // Add test groups as an additional category if any are enabled
      if (enabledTestGroups.length > 0) {
        const testCategory: LayoutGroupCategory = {
          name: 'Test Layouts',
          layoutGroups: enabledTestGroups,
        };
        categories = [...categories, testCategory];
      }
    }

    // Calculate menu dimensions
    const showFooter = !debugConfig || debugConfig.showFooter;
    this.menuDimensions = this.calculateMenuDimensions(categories, aspectRatio, showFooter);

    // Adjust position for boundaries with center alignment
    const adjusted = adjustMenuPosition(
      { x, y },
      this.menuDimensions,
      {
        screenWidth,
        screenHeight,
        edgePadding: MENU_EDGE_PADDING,
      },
      {
        centerHorizontally: true,
        reserveDebugPanelSpace: !!this.debugPanel,
        debugPanelGap: 20,
        debugPanelWidth: 300,
      }
    );

    // Store adjusted menu position
    this.menuX = adjusted.x;
    this.menuY = adjusted.y;

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
      const categoriesView = createCategoriesView(
        MINIATURE_DISPLAY_WIDTH,
        miniatureDisplayHeight,
        categories,
        debugConfig,
        (layout) => {
          if (this.onLayoutSelected) {
            this.onLayoutSelected(layout);
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
    const container = new St.BoxLayout({
      style_class: 'snap-menu',
      style: `
                background-color: ${MENU_BG_COLOR};
                border: 2px solid ${MENU_BORDER_COLOR};
                border-radius: 8px;
                padding: ${MENU_PADDING}px;
            `,
      vertical: true,
      visible: true,
      reactive: true,
      can_focus: true,
      track_hover: true,
    });
    this.container = container;

    // Add children to container
    container.add_child(categoriesElement);
    if (!debugConfig || debugConfig.showFooter) {
      container.add_child(footer);
    }

    // Position menu at adjusted coordinates
    container.set_position(this.menuX, this.menuY);

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

    // Show debug panel if enabled (always on the right side of menu)
    if (this.debugPanel) {
      const debugPanelGap = 20;
      const debugPanelX = this.menuX + this.menuDimensions.width + debugPanelGap;
      log(
        `[SnapMenu] Showing debug panel at: x=${debugPanelX}, y=${this.menuY}, menuHeight=${this.menuDimensions.height}`
      );
      this.debugPanel.show(debugPanelX, this.menuY, this.menuDimensions.height);
    }
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
      if (this.debugPanel) {
        this.debugPanel.hide();
      }

      this.container = null;
      this.background = null;
      this.layoutButtons.clear();
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
    if (this.container && this.menuDimensions) {
      // Store original cursor position
      this.originalCursorX = x;
      this.originalCursorY = y;

      // Adjust position for boundaries with center alignment
      const screenWidth = global.screen_width;
      const screenHeight = global.screen_height;
      const adjusted = adjustMenuPosition(
        { x, y },
        this.menuDimensions,
        {
          screenWidth,
          screenHeight,
          edgePadding: MENU_EDGE_PADDING,
        },
        {
          centerHorizontally: true,
          reserveDebugPanelSpace: !!this.debugPanel,
          debugPanelGap: 20,
          debugPanelWidth: 300,
        }
      );

      // Update stored menu position
      this.menuX = adjusted.x;
      this.menuY = adjusted.y;

      // Update container position
      this.container.set_position(adjusted.x, adjusted.y);

      // Update debug panel position if enabled (always on the right side)
      if (this.debugPanel) {
        const debugPanelGap = 20;
        const debugPanelX = adjusted.x + this.menuDimensions.width + debugPanelGap;
        this.debugPanel.updatePosition(debugPanelX, adjusted.y);
      }
    }
  }

  /**
   * Calculate menu dimensions based on categories to render
   */
  private calculateMenuDimensions(
    categoriesToRender: LayoutGroupCategory[],
    aspectRatio: number,
    showFooter: boolean
  ): { width: number; height: number } {
    // Handle empty categories case
    if (categoriesToRender.length === 0) {
      const minWidth = 200; // Minimum width for "No categories" message
      const minHeight = 120 + (showFooter ? FOOTER_MARGIN_TOP + 20 : 0);
      return { width: minWidth, height: minHeight };
    }

    const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;

    // Calculate width: maximum category width
    let maxCategoryWidth = 0;
    for (const category of categoriesToRender) {
      const numDisplays = category.layoutGroups.length;
      if (numDisplays > 0) {
        const displaysInWidestRow = Math.min(numDisplays, MAX_DISPLAYS_PER_ROW);
        const categoryWidth =
          displaysInWidestRow * MINIATURE_DISPLAY_WIDTH +
          (displaysInWidestRow - 1) * DISPLAY_SPACING_HORIZONTAL;
        maxCategoryWidth = Math.max(maxCategoryWidth, categoryWidth);
      }
    }
    const menuWidth = maxCategoryWidth + MENU_PADDING * 2;

    // Calculate height: sum of all category heights with spacing
    let totalHeight = MENU_PADDING; // Top padding
    for (let i = 0; i < categoriesToRender.length; i++) {
      const category = categoriesToRender[i];
      const numDisplays = category.layoutGroups.length;
      if (numDisplays > 0) {
        const numRows = Math.ceil(numDisplays / MAX_DISPLAYS_PER_ROW);
        // Each row has display height + bottom margin (DISPLAY_SPACING)
        const categoryHeight = numRows * (miniatureDisplayHeight + DISPLAY_SPACING);
        totalHeight += categoryHeight;

        // Add category spacing except for last category
        if (i < categoriesToRender.length - 1) {
          totalHeight += CATEGORY_SPACING;
        }
      }
    }

    // Add footer height if showing footer
    if (showFooter) {
      totalHeight += FOOTER_MARGIN_TOP + 20; // 20px approximate footer text height
    }

    totalHeight += MENU_PADDING; // Bottom padding

    return { width: menuWidth, height: totalHeight };
  }

  /**
   * Get layout at the given position, or null if position is not over a layout button
   * If multiple layouts overlap at this position, returns the first one found
   */
  getLayoutAtPosition(x: number, y: number): Layout | null {
    if (!this.container) {
      return null;
    }

    // Check each layout button to see if position is within its bounds
    for (const [button, layout] of this.layoutButtons.entries()) {
      const [actorX, actorY] = button.get_transformed_position();
      const [width, height] = button.get_transformed_size();

      if (x >= actorX && x <= actorX + width && y >= actorY && y <= actorY + height) {
        log(`[SnapMenu] Position (${x}, ${y}) is over layout: ${layout.label}`);
        return layout;
      }
    }

    log(`[SnapMenu] Position (${x}, ${y}) is not over any layout`);
    return null;
  }
}
