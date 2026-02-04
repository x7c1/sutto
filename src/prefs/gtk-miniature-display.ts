/**
 * GTK Miniature Display
 *
 * GTK version of miniature display for preferences UI.
 * Uses Gtk.DrawingArea + Cairo for rendering layout rectangles.
 */

import Gtk from 'gi://Gtk';

import type { LayoutGroup } from '../domain/layout/index.js';
import type { Monitor } from '../domain/monitor/index.js';

// Cairo Context interface for drawing operations
// Defined locally to avoid type conflicts with GI bindings
interface CairoContext {
  setSourceRGBA(r: number, g: number, b: number, a: number): void;
  fill(): void;
  stroke(): void;
  rectangle(x: number, y: number, width: number, height: number): void;
  setLineWidth(width: number): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(xc: number, yc: number, radius: number, angle1: number, angle2: number): void;
  closePath(): void;
  newPath(): void;
  setFontSize(size: number): void;
  showText(text: string): void;
  textExtents(text: string): { width: number; height: number };
}

// Colors matching the Shell version
const DISPLAY_BG_COLOR = { r: 0.08, g: 0.08, b: 0.08, a: 0.9 };
const LAYOUT_BG_COLOR = { r: 0.3, g: 0.3, b: 0.3, a: 0.6 };
const LAYOUT_BORDER_COLOR = { r: 1, g: 1, b: 1, a: 0.3 };
const MENU_BAR_COLOR = { r: 0.78, g: 0.78, b: 0.78, a: 0.9 };
const LABEL_BG_COLOR = { r: 0, g: 0, b: 0, a: 0.6 };
const LABEL_TEXT_COLOR = { r: 1, g: 1, b: 1, a: 0.9 };

export interface GtkMiniatureDisplayOptions {
  layoutGroup: LayoutGroup;
  displayWidth: number;
  displayHeight: number;
  monitor: Monitor;
  totalMonitors: number;
}

/**
 * Evaluate a simple layout expression (percentage, fraction, or pixels)
 * For display purposes only - simplified version
 */
function evaluateExpression(expr: string, containerSize: number): number {
  const trimmed = expr.trim();

  // Percentage: "50%"
  if (trimmed.endsWith('%')) {
    const percent = parseFloat(trimmed.slice(0, -1));
    return (percent / 100) * containerSize;
  }

  // Fraction: "1/3", "2/3"
  if (trimmed.includes('/')) {
    const [num, denom] = trimmed.split('/').map((s) => parseFloat(s.trim()));
    if (!Number.isNaN(num) && !Number.isNaN(denom) && denom !== 0) {
      return (num / denom) * containerSize;
    }
  }

  // Pixels: "100px" or just "100"
  const numValue = parseFloat(trimmed.replace('px', ''));
  if (!Number.isNaN(numValue)) {
    return numValue;
  }

  return 0;
}

/**
 * Create a GTK miniature display widget
 */
export function createGtkMiniatureDisplay(options: GtkMiniatureDisplayOptions): Gtk.Widget {
  const { layoutGroup, displayWidth, displayHeight, monitor, totalMonitors } = options;

  const drawingArea = new Gtk.DrawingArea();
  drawingArea.set_content_width(Math.round(displayWidth));
  drawingArea.set_content_height(Math.round(displayHeight));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawingArea.set_draw_func((_area: Gtk.DrawingArea, cr: any, width: number, height: number) => {
    const ctx = cr as CairoContext;

    // Draw display background (simple rectangle - no rounded corners)
    ctx.setSourceRGBA(
      DISPLAY_BG_COLOR.r,
      DISPLAY_BG_COLOR.g,
      DISPLAY_BG_COLOR.b,
      DISPLAY_BG_COLOR.a
    );
    ctx.rectangle(0, 0, width, height);
    ctx.fill();

    // Draw layout rectangles
    for (const layout of layoutGroup.layouts) {
      const x = evaluateExpression(layout.position.x, width);
      const y = evaluateExpression(layout.position.y, height);
      const w = evaluateExpression(layout.size.width, width);
      const h = evaluateExpression(layout.size.height, height);

      // Fill
      ctx.setSourceRGBA(LAYOUT_BG_COLOR.r, LAYOUT_BG_COLOR.g, LAYOUT_BG_COLOR.b, LAYOUT_BG_COLOR.a);
      ctx.rectangle(x + 1, y + 1, w - 2, h - 2);
      ctx.fill();

      // Border
      ctx.setSourceRGBA(
        LAYOUT_BORDER_COLOR.r,
        LAYOUT_BORDER_COLOR.g,
        LAYOUT_BORDER_COLOR.b,
        LAYOUT_BORDER_COLOR.a
      );
      ctx.setLineWidth(1);
      ctx.rectangle(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.stroke();
    }

    // Draw menu bar for primary monitor
    if (monitor.isPrimary) {
      ctx.setSourceRGBA(MENU_BAR_COLOR.r, MENU_BAR_COLOR.g, MENU_BAR_COLOR.b, MENU_BAR_COLOR.a);
      ctx.rectangle(0, 0, width, 4);
      ctx.fill();
    }

    // Draw monitor label when multiple monitors exist
    if (totalMonitors > 1) {
      const labelText = `${monitor.index + 1}`;
      const margin = 4;
      const paddingH = 6;
      const paddingV = 5;
      const fontSize = 10;
      const minLabelWidth = 20;

      ctx.setFontSize(fontSize);
      const extents = ctx.textExtents(labelText);
      const labelWidth = Math.max(extents.width + paddingH * 2, minLabelWidth);
      const labelHeight = extents.height + paddingV * 2;
      const labelX = margin;
      const labelY = height - labelHeight - margin;

      // Label background
      drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 4);
      ctx.setSourceRGBA(LABEL_BG_COLOR.r, LABEL_BG_COLOR.g, LABEL_BG_COLOR.b, LABEL_BG_COLOR.a);
      ctx.fill();

      // Label text - center using text extents
      ctx.setSourceRGBA(
        LABEL_TEXT_COLOR.r,
        LABEL_TEXT_COLOR.g,
        LABEL_TEXT_COLOR.b,
        LABEL_TEXT_COLOR.a
      );
      const textX = labelX + (labelWidth - extents.width) / 2;
      const textY = labelY + (labelHeight + extents.height) / 2;
      ctx.moveTo(textX, textY);
      ctx.showText(labelText);
    }
  });

  return drawingArea;
}

/**
 * Draw a rounded rectangle path
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
