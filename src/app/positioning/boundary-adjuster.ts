/**
 * Boundary Adjuster
 *
 * Provides functions to adjust UI element positions to keep them within screen boundaries.
 */

import type {
  DebugPanelPositionOptions,
  Dimensions,
  MainPanelPositionOptions,
  Position,
  ScreenBoundaries,
} from './types.js';

/**
 * Adjust main panel position to keep it within screen boundaries
 * Supports horizontal centering and debug panel space reservation
 */
export function adjustMainPanelPosition(
  cursorPosition: Position,
  panelDimensions: Dimensions,
  boundaries: ScreenBoundaries,
  options: MainPanelPositionOptions = {}
): Position {
  const {
    centerHorizontally = true,
    centerVertically = false,
    reserveDebugPanelSpace = false,
    debugPanelGap = 20,
    debugPanelWidth = 300,
  } = options;

  let adjustedX = cursorPosition.x;
  let adjustedY = cursorPosition.y;

  // Apply horizontal centering if requested
  if (centerHorizontally) {
    adjustedX = cursorPosition.x - panelDimensions.width / 2;
  }

  // Apply vertical centering if requested
  if (centerVertically) {
    adjustedY = cursorPosition.y - panelDimensions.height / 2;
  }

  // Calculate maximum X position
  let maxX: number;
  if (reserveDebugPanelSpace) {
    // Reserve space for debug panel on the right
    maxX =
      boundaries.screenWidth -
      panelDimensions.width -
      debugPanelGap -
      debugPanelWidth -
      boundaries.edgePadding;
  } else {
    maxX = boundaries.screenWidth - panelDimensions.width - boundaries.edgePadding;
  }

  // Check right edge: clamp to maxX
  if (adjustedX > maxX) {
    adjustedX = maxX;
  }

  // Check left edge: clamp to padding
  if (adjustedX < boundaries.edgePadding) {
    adjustedX = boundaries.edgePadding;
  }

  // Check bottom edge: shift up if needed
  if (adjustedY + panelDimensions.height > boundaries.screenHeight - boundaries.edgePadding) {
    adjustedY = boundaries.screenHeight - panelDimensions.height - boundaries.edgePadding;
  }

  // Check top edge: clamp to padding
  if (adjustedY < boundaries.edgePadding) {
    adjustedY = boundaries.edgePadding;
  }

  return { x: adjustedX, y: adjustedY };
}

/**
 * Adjust debug panel position to keep it within screen boundaries
 * By default, only adjusts Y coordinate (useful for panels positioned relative to main panel)
 */
export function adjustDebugPanelPosition(
  position: Position,
  panelDimensions: Dimensions,
  boundaries: ScreenBoundaries,
  options: DebugPanelPositionOptions = {}
): Position {
  const { adjustYOnly = true } = options;

  let adjustedX = position.x;
  let adjustedY = position.y;

  // Check bottom edge: shift up if needed
  if (adjustedY + panelDimensions.height > boundaries.screenHeight - boundaries.edgePadding) {
    adjustedY = boundaries.screenHeight - panelDimensions.height - boundaries.edgePadding;
  }

  // Check top edge: clamp to padding
  if (adjustedY < boundaries.edgePadding) {
    adjustedY = boundaries.edgePadding;
  }

  // Optionally adjust X coordinate as well
  if (!adjustYOnly) {
    // Check right edge
    if (adjustedX + panelDimensions.width > boundaries.screenWidth - boundaries.edgePadding) {
      adjustedX = boundaries.screenWidth - panelDimensions.width - boundaries.edgePadding;
    }

    // Check left edge
    if (adjustedX < boundaries.edgePadding) {
      adjustedX = boundaries.edgePadding;
    }
  }

  return { x: adjustedX, y: adjustedY };
}
