/**
 * MainPanelPositionManager
 *
 * Manages panel positioning and dimension calculations.
 * Handles boundary adjustments.
 */

import type St from 'gi://St';
import {
  CATEGORY_SPACING,
  DISPLAY_SPACING,
  DISPLAY_SPACING_HORIZONTAL,
  FOOTER_MARGIN_TOP,
  MAX_DISPLAYS_PER_ROW,
  MINIATURE_DISPLAY_WIDTH,
  PANEL_EDGE_PADDING,
  PANEL_PADDING,
} from '../constants.js';
import { adjustMainPanelPosition } from '../positioning/index.js';
import type { LayoutGroupCategory, Position, Size } from '../types/index.js';

export class MainPanelPositionManager {
  /**
   * Calculate panel dimensions based on categories to render
   */
  calculatePanelDimensions(
    categoriesToRender: LayoutGroupCategory[],
    aspectRatio: number,
    showFooter: boolean
  ): Size {
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
    const panelWidth = maxCategoryWidth + PANEL_PADDING * 2;

    // Calculate height: sum of all category heights with spacing
    let totalHeight = PANEL_PADDING; // Top padding
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

    totalHeight += PANEL_PADDING; // Bottom padding

    return { width: panelWidth, height: totalHeight };
  }

  /**
   * Adjust panel position for screen boundaries with center alignment
   */
  adjustPosition(
    cursor: Position,
    panelDimensions: Size,
    hasDebugPanel: boolean,
    centerVertically = false
  ): Position {
    const screenWidth = global.screen_width;
    const screenHeight = global.screen_height;

    const adjusted = adjustMainPanelPosition(
      cursor,
      panelDimensions,
      {
        screenWidth,
        screenHeight,
        edgePadding: PANEL_EDGE_PADDING,
      },
      {
        centerHorizontally: true,
        centerVertically,
        reserveDebugPanelSpace: hasDebugPanel,
        debugPanelGap: 20,
        debugPanelWidth: 300,
      }
    );

    return adjusted;
  }

  /**
   * Update panel container position
   */
  updatePanelPosition(container: St.BoxLayout, position: Position): void {
    container.set_position(position.x, position.y);
  }
}
