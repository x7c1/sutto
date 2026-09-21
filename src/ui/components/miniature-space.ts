/**
 * Miniature Space
 *
 * Creates a 2D spatial layout of monitors showing a Space.
 * Each Miniature Space represents one Space with monitors positioned
 * according to their physical arrangement.
 */

import Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import type { Layout, LayoutSelectedEvent, Space } from '../../domain/layout/index.js';
import type { Monitor } from '../../domain/monitor/index.js';
import type { LayoutHistoryRepository } from '../../operations/history/index.js';
import { MINIATURE_SPACE_BG_COLOR, SPACE_SPACING } from '../constants.js';
import { createMiniatureDisplayView } from './miniature-display.js';
import {
  calculateBoundingBoxForSpace,
  calculateDisplayRect,
  calculateSpaceDimensions,
} from './space-dimensions.js';

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
 * Create a Miniature Space view for a Space
 * Shows all monitors in their physical 2D arrangement
 * @param inactiveMonitorKeys - Set of monitor keys that don't exist in current physical setup (will be grayed out)
 */
export function createMiniatureSpaceView(
  space: Space,
  monitors: Map<string, Monitor>,
  window: Meta.Window | null,
  onLayoutSelected: (event: LayoutSelectedEvent) => void,
  layoutHistoryRepository: LayoutHistoryRepository,
  inactiveMonitorKeys: Set<string> = new Set()
): MiniatureSpaceView {
  // Calculate dimensions and scale for this Space
  const dimensions = calculateSpaceDimensions(space, monitors);
  const scale = dimensions.scale;

  // Calculate bounding box for all monitors in this Space (needed for positioning)
  const bbox = calculateBoundingBoxForSpace(space, monitors);

  // Create container with absolute positioning (size will be calculated after placing displays)
  // FixedLayout doesn't respect padding, so we handle margins via position calculation
  const spaceContainer = new St.Widget({
    style: `
      background-color: ${MINIATURE_SPACE_BG_COLOR};
      border-radius: 6px;
      margin-bottom: ${SPACE_SPACING}px;
    `,
    layout_manager: new Clutter.FixedLayout(),
  });

  const allLayoutButtons = new Map<St.Button, Layout>();
  const allButtonEvents: MiniatureSpaceView['buttonEvents'] = [];

  // Get total number of connected monitors
  const totalMonitors = monitors.size;

  // Create miniature display for each monitor in the Space
  for (const [monitorKey, layoutGroup] of Object.entries(space.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
      // Skip monitors that don't exist
      continue;
    }

    // Use geometry (physical size) instead of workArea for consistent sizing across monitors
    const displayRect = calculateDisplayRect(monitor, bbox, scale);

    // Check if this monitor is inactive (doesn't exist in current physical setup)
    const isInactive = inactiveMonitorKeys.has(monitorKey);

    // Create miniature display for this monitor
    const miniatureView = createMiniatureDisplayView(
      layoutGroup,
      displayRect.width,
      displayRect.height,
      window,
      onLayoutSelected,
      monitor,
      monitorKey,
      layoutHistoryRepository,
      false, // isLastInRow
      0, // No CSS margin needed - spacing handled by size/position adjustment
      totalMonitors,
      isInactive
    );

    // Position the miniature display
    miniatureView.miniatureDisplay.set_position(displayRect.x, displayRect.y);
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
