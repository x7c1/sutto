/**
 * Layout Expression System
 *
 * Public API for parsing layout expressions and resolving them to pixels.
 *
 * Evaluation is only exposed through resolveRect: a rectangle's position and size have to be
 * rounded together (see resolveRect), which evaluating them one value at a time cannot do.
 *
 * @example
 * ```typescript
 * import { resolveRect } from './layout-expression';
 *
 * const layout = { position: { x: '1/3', y: '0' }, size: { width: '1/3', height: '100%' } };
 * const rect = resolveRect(layout, { width: 300, height: 200 }); // → { x: 100, y: 0, width: 100, height: 200 }
 * ```
 */

export { parse } from './parser.js';
export type { PixelRect, RectExpressions, RectSize } from './rect.js';
export { resolveRect } from './rect.js';
export type { LayoutExpression, LayoutUnit } from './types.js';
