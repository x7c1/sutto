/**
 * GTK Miniature Space
 *
 * GTK version of miniature space for preferences UI.
 * Creates a 2D spatial layout of monitors showing a Space.
 */

import Gtk from 'gi://Gtk';

import type { Space } from '../domain/layout/index.js';
import type { Monitor } from '../domain/monitor/index.js';
import {
  calculateBoundingBoxForSpace,
  calculateDisplayRect,
  calculateSpaceDimensions,
} from '../ui/components/space-dimensions.js';
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

const MINIATURE_SPACE_BG_COLOR = { r: 0.31, g: 0.31, b: 0.31, a: 0.9 };

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

  // Create a drawing area for the background
  const bgDrawing = new Gtk.DrawingArea();
  bgDrawing.set_content_width(dimensions.width);
  bgDrawing.set_content_height(dimensions.height);

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

    const displayRect = calculateDisplayRect(monitor, bbox, scale);

    const miniatureDisplay = createGtkMiniatureDisplay({
      layoutGroup,
      displayWidth: displayRect.width,
      displayHeight: displayRect.height,
      monitor,
      totalMonitors,
    });

    container.put(miniatureDisplay, displayRect.x, displayRect.y);
  }

  // Set size request to ensure proper sizing
  container.set_size_request(dimensions.width, dimensions.height);

  return container;
}
