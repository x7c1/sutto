/**
 * Layout Rectangle Resolver
 *
 * Resolves a layout's position/size expressions to an integer pixel rectangle.
 */

import { evaluateExact } from './evaluator.js';
import { parse } from './parser.js';

export interface RectExpressions {
  position: { x: string; y: string };
  size: { width: string; height: string };
}

export interface RectSize {
  width: number;
  height: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Resolve layout expressions to an integer pixel rectangle
 *
 * Each edge (left, top, right, bottom) is rounded on its own and the size is
 * derived from the rounded edges. Rounding position and size independently
 * instead would let adjacent layouts disagree on their shared boundary by 1px
 * (e.g. thirds of 100px: x=33 + w=33 ends at 66, but the next one starts at 67),
 * which shows up as a gap or an overlap.
 *
 * @param layout - Position and size expressions
 * @param container - Container size in pixels (work area or miniature display)
 * @param screen - Optional screen size for scaling fixed pixel values (miniature display only)
 */
export function resolveRect(
  layout: RectExpressions,
  container: RectSize,
  screen?: RectSize
): PixelRect {
  const [x, right] = resolveEdges(
    layout.position.x,
    layout.size.width,
    container.width,
    screen?.width
  );
  const [y, bottom] = resolveEdges(
    layout.position.y,
    layout.size.height,
    container.height,
    screen?.height
  );
  return { x, y, width: right - x, height: bottom - y };
}

function resolveEdges(
  position: string,
  size: string,
  containerSize: number,
  screenSize?: number
): [number, number] {
  const start = evaluateExact(parse(position), containerSize, screenSize);
  const length = evaluateExact(parse(size), containerSize, screenSize);
  return [Math.round(start), Math.round(start + length)];
}
