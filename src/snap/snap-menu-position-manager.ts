/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * SnapMenuPositionManager
 *
 * Manages menu positioning and dimension calculations.
 * Handles boundary adjustments.
 */

import { adjustMenuPosition } from './positioning';
import {
  CATEGORY_SPACING,
  DISPLAY_SPACING,
  DISPLAY_SPACING_HORIZONTAL,
  FOOTER_MARGIN_TOP,
  MAX_DISPLAYS_PER_ROW,
  MENU_EDGE_PADDING,
  MENU_PADDING,
  MINIATURE_DISPLAY_WIDTH,
} from './snap-menu-constants';
import type { LayoutGroupCategory } from './types';

// @ts-expect-error - St is used for type annotations
const St = imports.gi.St;

export class SnapMenuPositionManager {
  /**
   * Calculate menu dimensions based on categories to render
   */
  calculateMenuDimensions(
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
   * Adjust menu position for screen boundaries with center alignment
   */
  adjustPosition(
    cursorX: number,
    cursorY: number,
    menuDimensions: { width: number; height: number },
    hasDebugPanel: boolean
  ): { x: number; y: number } {
    const screenWidth = global.screen_width;
    const screenHeight = global.screen_height;

    const adjusted = adjustMenuPosition(
      { x: cursorX, y: cursorY },
      menuDimensions,
      {
        screenWidth,
        screenHeight,
        edgePadding: MENU_EDGE_PADDING,
      },
      {
        centerHorizontally: true,
        reserveDebugPanelSpace: hasDebugPanel,
        debugPanelGap: 20,
        debugPanelWidth: 300,
      }
    );

    return adjusted;
  }

  /**
   * Update menu container position
   */
  updateMenuPosition(container: St.BoxLayout, x: number, y: number): void {
    container.set_position(x, y);
  }
}
