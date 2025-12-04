/**
 * Layout Expression System - Type Definitions
 *
 * Abstract Syntax Tree (AST) types for parsing and evaluating layout expressions.
 * Supports fractions, percentages, pixels, and arithmetic operations.
 */

/**
 * Base unit types for layout expressions
 */
export type LayoutUnit =
  | { type: 'fraction'; numerator: number; denominator: number }
  | { type: 'percentage'; value: number } // 0-1 range (e.g., 0.5 for 50%)
  | { type: 'pixel'; value: number }
  | { type: 'zero' };

/**
 * Layout expression AST
 * Can be a simple unit or a composite expression with operations
 */
export type LayoutExpression =
  | LayoutUnit
  | { type: 'add'; left: LayoutExpression; right: LayoutExpression }
  | { type: 'subtract'; left: LayoutExpression; right: LayoutExpression };
