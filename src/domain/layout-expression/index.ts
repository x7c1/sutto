/**
 * Layout Expression System
 *
 * Public API for parsing and evaluating layout expressions.
 *
 * @example
 * ```typescript
 * import { parse, evaluate } from './layout-expression';
 *
 * const expr = parse('1/3 + 10px');
 * const pixels = evaluate(expr, 300); // → 110
 * ```
 */

export { evaluate } from './evaluator.js';
export { parse } from './parser.js';
export type { LayoutExpression, LayoutUnit } from './types.js';
