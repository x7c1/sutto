/**
 * Miniature Space
 *
 * Creates a 2D spatial layout of monitors showing a Display Group.
 * Each Miniature Space represents one Display Group with monitors positioned
 * according to their physical arrangement.
 */

import Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import { DISPLAY_GROUP_SPACING, MINIATURE_SPACE_BG_COLOR, MONITOR_MARGIN } from '../constants.js';
import type { LayoutHistoryRepository } from '../repository/layout-history.js';
import type { DisplayGroup, Layout, Monitor } from '../types/index.js';
import { calculateDisplayGroupDimensions } from './display-group-dimensions.js';
import { createMiniatureDisplayView } from './miniature-display.js';

export interface MiniatureSpaceView {
  spaceContainer: St.Widget;
  layoutButtons: Map<St.Button, Layout>;
  buttonEvents: Array<{
    button: St.Button;
    enterEventId: number;
    leaveEventId: number;
    clickEventId: number;
  }>;
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
 * Create a Miniature Space view for a Display Group
 * Shows all monitors in their physical 2D arrangement
 */
export function createMiniatureSpaceView(
  displayGroup: DisplayGroup,
  monitors: Map<string, Monitor>,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout) => void,
  layoutHistoryRepository: LayoutHistoryRepository
): MiniatureSpaceView {
  // Calculate dimensions and scale for this Display Group
  const dimensions = calculateDisplayGroupDimensions(displayGroup, monitors);
  const scale = dimensions.scale;

  // Calculate bounding box for all monitors in this Display Group (needed for positioning)
  const bbox = calculateBoundingBoxForDisplayGroup(displayGroup, monitors);

  // Create container with absolute positioning (size will be calculated after placing displays)
  // FixedLayout doesn't respect padding, so we handle margins via position calculation
  const spaceContainer = new St.Widget({
    style: `
      background-color: ${MINIATURE_SPACE_BG_COLOR};
      border-radius: 6px;
      margin-bottom: ${DISPLAY_GROUP_SPACING}px;
    `,
    layout_manager: new Clutter.FixedLayout(),
  });

  const allLayoutButtons = new Map<St.Button, Layout>();
  const allButtonEvents: MiniatureSpaceView['buttonEvents'] = [];

  // Get total number of connected monitors
  const totalMonitors = monitors.size;

  // Create miniature display for each monitor in the Display Group
  for (const [monitorKey, layoutGroup] of Object.entries(displayGroup.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
      // Skip monitors that don't exist
      continue;
    }

    // Calculate scaled dimensions for this monitor
    // Use geometry (physical size) instead of workArea for consistent sizing across monitors
    // Reduce size by MONITOR_MARGIN (half on each side) to create gap between adjacent displays
    const scaledWidth = monitor.geometry.width * scale - MONITOR_MARGIN;
    const scaledHeight = monitor.geometry.height * scale - MONITOR_MARGIN;

    // Calculate position relative to bounding box origin
    // Add MONITOR_MARGIN offset to create outer margin (FixedLayout doesn't respect padding)
    const scaledX = (monitor.geometry.x - bbox.minX) * scale + MONITOR_MARGIN;
    const scaledY = (monitor.geometry.y - bbox.minY) * scale + MONITOR_MARGIN;

    // Create miniature display for this monitor
    const miniatureView = createMiniatureDisplayView(
      layoutGroup,
      scaledWidth,
      scaledHeight,
      window,
      onLayoutSelected,
      monitor,
      layoutHistoryRepository,
      false, // isLastInRow
      0, // No CSS margin needed - spacing handled by size/position adjustment
      totalMonitors
    );

    // Position the miniature display
    miniatureView.miniatureDisplay.set_position(scaledX, scaledY);
    spaceContainer.add_child(miniatureView.miniatureDisplay);

    // Collect layout buttons and events
    for (const [button, layout] of miniatureView.layoutButtons.entries()) {
      allLayoutButtons.set(button, layout);
    }
    allButtonEvents.push(...miniatureView.buttonEvents);
  }

  // Update container size using pre-calculated dimensions
  spaceContainer.set_size(dimensions.width, dimensions.height);

  return {
    spaceContainer,
    layoutButtons: allLayoutButtons,
    buttonEvents: allButtonEvents,
  };
}
