/**
 * Display Group Dimensions Calculator
 *
 * Shared utilities for calculating Display Group sizes based on monitor configuration.
 * Used by both miniature-space.ts (for rendering) and position-manager.ts (for layout).
 */

import { MAX_MONITOR_DISPLAY_WIDTH, MONITOR_MARGIN } from '../constants.js';
import type { DisplayGroup, Monitor } from '../types/index.js';

export interface DisplayGroupDimensions {
  width: number;
  height: number;
  scale: number;
}

/**
 * Calculate bounding box for monitors referenced in a Display Group
 */
function calculateBoundingBoxForDisplayGroup(
  displayGroup: DisplayGroup,
  monitors: Map<string, Monitor>
): { minX: number; minY: number; width: number; height: number } {
  const monitorKeys = Object.keys(displayGroup.displays);
  const relevantMonitors: Monitor[] = [];

  for (const key of monitorKeys) {
    const monitor = monitors.get(key);
    if (monitor) {
      relevantMonitors.push(monitor);
    }
  }

  if (relevantMonitors.length === 0) {
    return { minX: 0, minY: 0, width: 1920, height: 1080 }; // Fallback
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const monitor of relevantMonitors) {
    const { geometry } = monitor;
    minX = Math.min(minX, geometry.x);
    minY = Math.min(minY, geometry.y);
    maxX = Math.max(maxX, geometry.x + geometry.width);
    maxY = Math.max(maxY, geometry.y + geometry.height);
  }

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate the dimensions of a Display Group
 * Returns the width and height of the miniature space container
 */
export function calculateDisplayGroupDimensions(
  displayGroup: DisplayGroup,
  monitors: Map<string, Monitor>
): DisplayGroupDimensions {
  // Find the widest monitor in this Display Group
  let maxMonitorWidth = 0;
  for (const [monitorKey, _] of Object.entries(displayGroup.displays)) {
    const monitor = monitors.get(monitorKey);
    if (monitor) {
      maxMonitorWidth = Math.max(maxMonitorWidth, monitor.geometry.width);
    }
  }

  // Calculate scale factor based on the widest monitor
  const scale =
    maxMonitorWidth > 0 ? Math.min(MAX_MONITOR_DISPLAY_WIDTH / maxMonitorWidth, 1.0) : 1.0;

  // Calculate bounding box for all monitors in this Display Group
  const bbox = calculateBoundingBoxForDisplayGroup(displayGroup, monitors);

  // Track actual bounding box of placed displays (including margins)
  let actualMinX = Infinity;
  let actualMinY = Infinity;
  let actualMaxX = -Infinity;
  let actualMaxY = -Infinity;

  // Calculate positions and sizes for each monitor
  for (const [monitorKey, _] of Object.entries(displayGroup.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
      // Monitor not found - use fallback dimensions
      const scaledWidth = 200 * scale;
      const scaledHeight = 150 * scale;
      const errorX = parseInt(monitorKey, 10) * (scaledWidth + 20);
      const errorY = 0;

      actualMinX = Math.min(actualMinX, errorX);
      actualMinY = Math.min(actualMinY, errorY);
      actualMaxX = Math.max(actualMaxX, errorX + scaledWidth);
      actualMaxY = Math.max(actualMaxY, errorY + scaledHeight);
      continue;
    }

    // Calculate scaled dimensions for this monitor
    const scaledWidth = monitor.geometry.width * scale - MONITOR_MARGIN;
    const scaledHeight = monitor.geometry.height * scale - MONITOR_MARGIN;

    // Calculate position relative to bounding box origin
    const scaledX = (monitor.geometry.x - bbox.minX) * scale + MONITOR_MARGIN;
    const scaledY = (monitor.geometry.y - bbox.minY) * scale + MONITOR_MARGIN;

    // Update actual bounding box to include this display
    actualMinX = Math.min(actualMinX, scaledX);
    actualMinY = Math.min(actualMinY, scaledY);
    actualMaxX = Math.max(actualMaxX, scaledX + scaledWidth);
    actualMaxY = Math.max(actualMaxY, scaledY + scaledHeight);
  }

  // Calculate final container size based on actual bounding box of all displays
  const containerWidth = actualMaxX + MONITOR_MARGIN;
  const containerHeight = actualMaxY + MONITOR_MARGIN;

  return {
    width: containerWidth,
    height: containerHeight,
    scale,
  };
}
