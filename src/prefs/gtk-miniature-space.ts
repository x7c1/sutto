/**
 * GTK Miniature Space
 *
 * GTK version of miniature space for preferences UI.
 * Creates a 2D spatial layout of monitors showing a Space.
 */

import Gtk from 'gi://Gtk';

import { DEFAULT_MONITOR_HEIGHT, DEFAULT_MONITOR_WIDTH } from '../app/constants.js';
import type { Monitor, Space } from '../app/types/index.js';
import { createGtkMiniatureDisplay } from './gtk-miniature-display.js';

// Cairo Context interface for drawing operations
// Defined locally to avoid type conflicts with GI bindings
interface CairoContext {
  setSourceRGBA(r: number, g: number, b: number, a: number): void;
  fill(): void;
  arc(xc: number, yc: number, radius: number, angle1: number, angle2: number): void;
  closePath(): void;
  newPath(): void;
}

// Constants matching the Shell version
const MAX_MONITOR_DISPLAY_WIDTH = 240;
const MAX_MONITOR_DISPLAY_HEIGHT = 100;
const MONITOR_MARGIN = 6;
const MINIATURE_SPACE_BG_COLOR = { r: 0.31, g: 0.31, b: 0.31, a: 0.9 };

/**
 * Calculate bounding box for monitors referenced in a Space
 */
function calculateBoundingBoxForSpace(
  space: Space,
  monitors: Map<string, Monitor>
): { minX: number; minY: number; width: number; height: number } {
  const monitorKeys = Object.keys(space.displays);
  const relevantMonitors: Monitor[] = [];

  for (const key of monitorKeys) {
    const monitor = monitors.get(key);
    if (monitor) {
      relevantMonitors.push(monitor);
    }
  }

  if (relevantMonitors.length === 0) {
    return { minX: 0, minY: 0, width: DEFAULT_MONITOR_WIDTH, height: DEFAULT_MONITOR_HEIGHT };
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
 * Calculate scale factor for the space based on height
 */
function calculateScale(space: Space, monitors: Map<string, Monitor>): number {
  let maxMonitorWidth = 0;
  let maxMonitorHeight = 0;
  for (const [monitorKey] of Object.entries(space.displays)) {
    const monitor = monitors.get(monitorKey);
    if (monitor) {
      maxMonitorWidth = Math.max(maxMonitorWidth, monitor.geometry.width);
      maxMonitorHeight = Math.max(maxMonitorHeight, monitor.geometry.height);
    }
  }
  const scaleByWidth =
    maxMonitorWidth > 0 ? Math.min(MAX_MONITOR_DISPLAY_WIDTH / maxMonitorWidth, 1.0) : 1.0;
  const scaleByHeight =
    maxMonitorHeight > 0 ? Math.min(MAX_MONITOR_DISPLAY_HEIGHT / maxMonitorHeight, 1.0) : 1.0;
  return Math.min(scaleByWidth, scaleByHeight);
}

/**
 * Calculate space dimensions
 */
export function calculateSpaceDimensions(
  space: Space,
  monitors: Map<string, Monitor>
): { width: number; height: number; scale: number } {
  const scale = calculateScale(space, monitors);
  const bbox = calculateBoundingBoxForSpace(space, monitors);

  let actualMinX = Infinity;
  let actualMinY = Infinity;
  let actualMaxX = -Infinity;
  let actualMaxY = -Infinity;

  for (const [monitorKey] of Object.entries(space.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
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

    const scaledWidth = monitor.geometry.width * scale - MONITOR_MARGIN;
    const scaledHeight = monitor.geometry.height * scale - MONITOR_MARGIN;
    const scaledX = (monitor.geometry.x - bbox.minX) * scale + MONITOR_MARGIN;
    const scaledY = (monitor.geometry.y - bbox.minY) * scale + MONITOR_MARGIN;

    actualMinX = Math.min(actualMinX, scaledX);
    actualMinY = Math.min(actualMinY, scaledY);
    actualMaxX = Math.max(actualMaxX, scaledX + scaledWidth);
    actualMaxY = Math.max(actualMaxY, scaledY + scaledHeight);
  }

  return {
    width: actualMaxX + MONITOR_MARGIN,
    height: actualMaxY + MONITOR_MARGIN,
    scale,
  };
}

/**
 * Draw rounded rectangle path
 */
function drawRoundedRect(
  cr: CairoContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const degrees = Math.PI / 180;
  cr.newPath();
  cr.arc(x + width - radius, y + radius, radius, -90 * degrees, 0);
  cr.arc(x + width - radius, y + height - radius, radius, 0, 90 * degrees);
  cr.arc(x + radius, y + height - radius, radius, 90 * degrees, 180 * degrees);
  cr.arc(x + radius, y + radius, radius, 180 * degrees, 270 * degrees);
  cr.closePath();
}

export interface GtkMiniatureSpaceOptions {
  space: Space;
  monitors: Map<string, Monitor>;
}

/**
 * Create a GTK miniature space widget
 */
export function createGtkMiniatureSpace(options: GtkMiniatureSpaceOptions): Gtk.Widget {
  const { space, monitors } = options;
  const dimensions = calculateSpaceDimensions(space, monitors);
  const scale = dimensions.scale;
  const bbox = calculateBoundingBoxForSpace(space, monitors);
  const totalMonitors = monitors.size;

  // Use Gtk.Fixed for absolute positioning (similar to Clutter.FixedLayout)
  const container = new Gtk.Fixed();

  // Create a drawing area for the background (integers for GTK)
  const bgDrawing = new Gtk.DrawingArea();
  bgDrawing.set_content_width(Math.round(dimensions.width));
  bgDrawing.set_content_height(Math.round(dimensions.height));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bgDrawing.set_draw_func((_area: Gtk.DrawingArea, cr: any, width: number, height: number) => {
    const ctx = cr as CairoContext;
    drawRoundedRect(ctx, 0, 0, width, height, 6);
    ctx.setSourceRGBA(
      MINIATURE_SPACE_BG_COLOR.r,
      MINIATURE_SPACE_BG_COLOR.g,
      MINIATURE_SPACE_BG_COLOR.b,
      MINIATURE_SPACE_BG_COLOR.a
    );
    ctx.fill();
  });

  container.put(bgDrawing, 0, 0);

  // Add miniature displays for each monitor
  for (const [monitorKey, layoutGroup] of Object.entries(space.displays)) {
    const monitor = monitors.get(monitorKey);

    if (!monitor) {
      continue;
    }

    // Use Math.round() for GTK which expects integer coordinates
    const scaledWidth = Math.round(monitor.geometry.width * scale - MONITOR_MARGIN);
    const scaledHeight = Math.round(monitor.geometry.height * scale - MONITOR_MARGIN);
    const scaledX = Math.round((monitor.geometry.x - bbox.minX) * scale + MONITOR_MARGIN);
    const scaledY = Math.round((monitor.geometry.y - bbox.minY) * scale + MONITOR_MARGIN);

    const miniatureDisplay = createGtkMiniatureDisplay({
      layoutGroup,
      displayWidth: scaledWidth,
      displayHeight: scaledHeight,
      monitor,
      totalMonitors,
    });

    container.put(miniatureDisplay, scaledX, scaledY);
  }

  // Set size request to ensure proper sizing (integers for GTK)
  container.set_size_request(Math.round(dimensions.width), Math.round(dimensions.height));

  return container;
}
