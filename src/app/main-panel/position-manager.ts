/**
 * MainPanelPositionManager
 *
 * Manages panel positioning and dimension calculations.
 * Handles boundary adjustments.
 */

import type St from 'gi://St';
import {
  CATEGORY_SPACING,
  DISPLAY_GROUP_SPACING,
  FOOTER_MARGIN_TOP,
  PANEL_EDGE_PADDING,
  PANEL_PADDING,
} from '../constants.js';
import type { MonitorManager } from '../monitor/manager.js';
import { adjustMainPanelPosition } from '../positioning/index.js';
import type { ScreenBoundaries } from '../positioning/types.js';
import type { LayoutCategory, Position, Size } from '../types/index.js';
import { calculateDisplayGroupDimensions } from '../ui/display-group-dimensions.js';

export class MainPanelPositionManager {
  private monitorManager: MonitorManager;

  constructor(monitorManager: MonitorManager) {
    this.monitorManager = monitorManager;
  }
  /**
   * Calculate panel dimensions based on categories to render
   * Only supports new LayoutCategory format
   */
  calculatePanelDimensions(categoriesToRender: LayoutCategory[], showFooter: boolean): Size {
    // Handle empty categories case
    if (categoriesToRender.length === 0) {
      const minWidth = 200; // Minimum width for "No categories" message
      const minHeight = 120 + (showFooter ? FOOTER_MARGIN_TOP + 20 : 0);
      return { width: minWidth, height: minHeight };
    }

    const monitors = this.monitorManager.getMonitors();

    // Calculate width: maximum category width
    let maxCategoryWidth = 0;
    for (const category of categoriesToRender) {
      // Defensive check: ensure category has displayGroups array
      if (!category.displayGroups || !Array.isArray(category.displayGroups)) {
        continue;
      }

      // Calculate total width for all Display Groups in this category (horizontal layout)
      let categoryWidth = 0;
      for (let j = 0; j < category.displayGroups.length; j++) {
        const displayGroup = category.displayGroups[j];
        const dimensions = calculateDisplayGroupDimensions(displayGroup, monitors);
        categoryWidth += dimensions.width;

        // Add spacing between Display Groups (except for last one)
        if (j < category.displayGroups.length - 1) {
          categoryWidth += DISPLAY_GROUP_SPACING;
        }
      }

      maxCategoryWidth = Math.max(maxCategoryWidth, categoryWidth);
    }
    const panelWidth = maxCategoryWidth + PANEL_PADDING * 2;

    // Calculate height: sum of all category heights with spacing
    let totalHeight = PANEL_PADDING; // Top padding
    for (let i = 0; i < categoriesToRender.length; i++) {
      const category = categoriesToRender[i];

      // Defensive check: ensure category has displayGroups array
      if (!category.displayGroups || !Array.isArray(category.displayGroups)) {
        continue;
      }

      // Find the tallest Display Group in this category
      let maxDisplayGroupHeight = 0;
      for (const displayGroup of category.displayGroups) {
        const dimensions = calculateDisplayGroupDimensions(displayGroup, monitors);
        maxDisplayGroupHeight = Math.max(maxDisplayGroupHeight, dimensions.height);
      }

      if (maxDisplayGroupHeight > 0) {
        // Add the height of this category (tallest Display Group + bottom margin)
        totalHeight += maxDisplayGroupHeight + DISPLAY_GROUP_SPACING;

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
   * Constrains panel within the monitor that contains the cursor
   */
  adjustPosition(cursor: Position, panelDimensions: Size, centerVertically = false): Position {
    // Get monitor at cursor position
    const monitor = this.monitorManager.getMonitorAtPosition(cursor.x, cursor.y);

    // Use monitor workArea if found, otherwise fallback to global screen
    let boundaries: ScreenBoundaries;
    if (monitor) {
      boundaries = {
        offsetX: monitor.workArea.x,
        offsetY: monitor.workArea.y,
        screenWidth: monitor.workArea.width,
        screenHeight: monitor.workArea.height,
        edgePadding: PANEL_EDGE_PADDING,
      };
    } else {
      boundaries = {
        offsetX: 0,
        offsetY: 0,
        screenWidth: global.screen_width,
        screenHeight: global.screen_height,
        edgePadding: PANEL_EDGE_PADDING,
      };
    }

    const adjusted = adjustMainPanelPosition(cursor, panelDimensions, boundaries, {
      centerHorizontally: true,
      centerVertically,
    });

    return adjusted;
  }

  /**
   * Update panel container position
   */
  updatePanelPosition(container: St.BoxLayout, position: Position): void {
    container.set_position(position.x, position.y);
  }
}
