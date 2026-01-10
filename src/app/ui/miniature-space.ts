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
import { DISPLAY_GROUP_SPACING, MAX_PANEL_HEIGHT, MAX_PANEL_WIDTH } from '../constants.js';
import type { DebugConfig } from '../debug-panel/config.js';
import type { LayoutHistoryRepository } from '../repository/layout-history.js';
import type { DisplayGroup, Layout, Monitor } from '../types/index.js';
import {
  createMiniatureDisplayErrorView,
  createMiniatureDisplayView,
} from './miniature-display.js';

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
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void,
  layoutHistoryRepository: LayoutHistoryRepository
): MiniatureSpaceView {
  // Calculate bounding box for all monitors in this Display Group
  const bbox = calculateBoundingBoxForDisplayGroup(displayGroup, monitors);

  // Calculate scale factor to fit in panel constraints
  const scaleX = MAX_PANEL_WIDTH / bbox.width;
  const scaleY = MAX_PANEL_HEIGHT / bbox.height;
  const scale = Math.min(scaleX, scaleY, 1.0); // Never scale up

  // Create container with absolute positioning
  const spaceContainer = new St.Widget({
    style: `
      margin-bottom: ${DISPLAY_GROUP_SPACING}px;
    `,
    layout_manager: new Clutter.FixedLayout(),
  });

  // Add Display Group name label
  const nameLabel = new St.Label({
    text: displayGroup.name,
    style: `
      color: rgba(255, 255, 255, 0.9);
      font-size: 11pt;
      font-weight: bold;
      padding: 4px 8px;
      margin-bottom: 8px;
    `,
  });
  spaceContainer.add_child(nameLabel);

  const allLayoutButtons = new Map<St.Button, Layout>();
  const allButtonEvents: MiniatureSpaceView['buttonEvents'] = [];

  // Create miniature display for each monitor in the Display Group
  for (const [monitorKey, layoutGroup] of Object.entries(displayGroup.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
      // Monitor not found - show error indicator
      const scaledWidth = 200 * scale;
      const scaledHeight = 150 * scale;
      const errorView = createMiniatureDisplayErrorView(monitorKey, scaledWidth, scaledHeight);

      // Position error view (we don't know exact position, so place it sequentially)
      const errorX = parseInt(monitorKey, 10) * (scaledWidth + 20);
      const errorY = 40; // Below the Display Group name
      errorView.set_position(errorX, errorY);
      spaceContainer.add_child(errorView);
      continue;
    }

    // Calculate scaled dimensions for this monitor
    const scaledWidth = monitor.workArea.width * scale;
    const scaledHeight = monitor.workArea.height * scale;

    // Calculate position relative to bounding box origin
    const scaledX = (monitor.geometry.x - bbox.minX) * scale;
    const scaledY = (monitor.geometry.y - bbox.minY) * scale + 40; // +40 for Display Group name

    // Create miniature display for this monitor
    const miniatureView = createMiniatureDisplayView(
      layoutGroup,
      scaledWidth,
      scaledHeight,
      debugConfig,
      window,
      onLayoutSelected,
      false, // isLastInRow
      monitor,
      monitorKey, // Pass monitorKey for selection
      layoutHistoryRepository
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

  return {
    spaceContainer,
    layoutButtons: allLayoutButtons,
    buttonEvents: allButtonEvents,
  };
}
