/**
 * Boundary Adjuster
 *
 * Provides functions to adjust UI element positions to keep them within screen boundaries.
 */

import type { Dimensions, MainPanelPositionOptions, Position, ScreenBoundaries } from './types.js';

/**
 * Adjust main panel position to keep it within screen boundaries
 * Supports horizontal and vertical centering
 */
export function adjustMainPanelPosition(
  cursorPosition: Position,
  panelDimensions: Dimensions,
  boundaries: ScreenBoundaries,
  options: MainPanelPositionOptions = {}
): Position {
  const { centerHorizontally = true, centerVertically = false } = options;

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

  // Calculate boundaries in global coordinate space
  const minX = boundaries.offsetX + boundaries.edgePadding;
  const maxX =
    boundaries.offsetX + boundaries.screenWidth - panelDimensions.width - boundaries.edgePadding;
  const minY = boundaries.offsetY + boundaries.edgePadding;
  const maxY =
    boundaries.offsetY + boundaries.screenHeight - panelDimensions.height - boundaries.edgePadding;

  // Check right edge: clamp to maxX
  if (adjustedX > maxX) {
    adjustedX = maxX;
  }

  // Check left edge: clamp to minX
  if (adjustedX < minX) {
    adjustedX = minX;
  }

  // Check bottom edge: clamp to maxY
  if (adjustedY > maxY) {
    adjustedY = maxY;
  }

  // Check top edge: clamp to minY
  if (adjustedY < minY) {
    adjustedY = minY;
  }

  return { x: adjustedX, y: adjustedY };
}
