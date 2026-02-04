/**
 * MainPanelPositionManager
 *
 * Manages panel positioning and dimension calculations.
 * Handles boundary adjustments.
 */

import Clutter from 'gi://Clutter';
import type St from 'gi://St';
import type { Position, Size } from '../../domain/geometry/index.js';
import type { SpacesRow } from '../../domain/layout/index.js';
import { adjustMainPanelPosition } from '../../domain/positioning/index.js';
import type { ScreenBoundaries } from '../../domain/positioning/types.js';
import type { MonitorEnvironmentUsecase } from '../../usecase/monitor/index.js';
import { calculateSpaceDimensions } from '../components/space-dimensions.js';
import {
  FOOTER_MARGIN_TOP,
  PANEL_EDGE_PADDING,
  PANEL_PADDING,
  ROW_SPACING,
  SPACE_SPACING,
} from '../constants.js';

export class MainPanelPositionManager {
  private monitorEnvironment: MonitorEnvironmentUsecase;

  constructor(monitorEnvironment: MonitorEnvironmentUsecase) {
    this.monitorEnvironment = monitorEnvironment;
  }
  /**
   * Calculate panel dimensions based on rows to render
   * Only supports SpacesRow format
   */
  calculatePanelDimensions(rowsToRender: SpacesRow[], showFooter: boolean): Size {
    // Handle empty rows case
    if (rowsToRender.length === 0) {
      const minWidth = 200; // Minimum width for "No rows" message
      const minHeight = 120 + (showFooter ? FOOTER_MARGIN_TOP + 20 : 0);
      return { width: minWidth, height: minHeight };
    }

    const monitors = this.monitorEnvironment.getMonitors();

    // Calculate width: maximum row width
    let maxRowWidth = 0;
    for (const row of rowsToRender) {
      // Defensive check: ensure row has spaces array
      if (!row.spaces || !Array.isArray(row.spaces)) {
        continue;
      }

      // Calculate total width for all Spaces in this row (horizontal layout)
      let rowWidth = 0;
      for (let j = 0; j < row.spaces.length; j++) {
        const space = row.spaces[j];
        const dimensions = calculateSpaceDimensions(space, monitors);
        rowWidth += dimensions.width;

        // Add spacing between Spaces (except for last one)
        if (j < row.spaces.length - 1) {
          rowWidth += SPACE_SPACING;
        }
      }

      maxRowWidth = Math.max(maxRowWidth, rowWidth);
    }
    const panelWidth = maxRowWidth + PANEL_PADDING * 2;

    // Calculate height: sum of all row heights with spacing
    let totalHeight = PANEL_PADDING; // Top padding
    for (let i = 0; i < rowsToRender.length; i++) {
      const row = rowsToRender[i];

      // Defensive check: ensure row has spaces array
      if (!row.spaces || !Array.isArray(row.spaces)) {
        continue;
      }

      // Find the tallest Space in this row
      let maxSpaceHeight = 0;
      for (const space of row.spaces) {
        const dimensions = calculateSpaceDimensions(space, monitors);
        maxSpaceHeight = Math.max(maxSpaceHeight, dimensions.height);
      }

      if (maxSpaceHeight > 0) {
        // Add the height of this row (tallest Space + bottom margin)
        totalHeight += maxSpaceHeight + SPACE_SPACING;

        // Add row spacing except for last row
        if (i < rowsToRender.length - 1) {
          totalHeight += ROW_SPACING;
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
    const monitor = this.monitorEnvironment.getMonitorAtPosition(cursor.x, cursor.y);

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
   * Update panel container position with smooth animation
   */
  updatePanelPosition(container: St.BoxLayout, position: Position): void {
    container.ease({
      x: position.x,
      y: position.y,
      duration: 50,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });
  }
}
