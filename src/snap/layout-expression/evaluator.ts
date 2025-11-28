/**
 * Layout Expression Evaluator
 *
 * Evaluates parsed layout expressions (AST) to pixel values.
 * Takes container size as context and resolves all units to pixels.
 */

import type { LayoutExpression, LayoutUnit } from './types';

/**
 * Evaluate expression to pixel value
 * @param expr - Parsed expression AST
 * @param containerSize - Container size in pixels (miniature display width or height)
 * @param screenSize - Optional screen size for scaling fixed pixel values (miniature display only)
 * @returns Resolved pixel value (rounded to nearest integer)
 */
export function evaluate(
    expr: LayoutExpression,
    containerSize: number,
    screenSize?: number
): number {
    const result = evaluateRecursive(expr, containerSize, screenSize);
    return Math.round(result);
}

/**
 * Recursive evaluation helper
 */
function evaluateRecursive(
    expr: LayoutExpression,
    containerSize: number,
    screenSize?: number
): number {
    switch (expr.type) {
        case 'zero':
        case 'fraction':
        case 'percentage':
        case 'pixel':
            return resolveUnit(expr, containerSize, screenSize);

        case 'add': {
            const left = evaluateRecursive(expr.left, containerSize, screenSize);
            const right = evaluateRecursive(expr.right, containerSize, screenSize);
            return left + right;
        }

        case 'subtract': {
            const left = evaluateRecursive(expr.left, containerSize, screenSize);
            const right = evaluateRecursive(expr.right, containerSize, screenSize);
            return left - right;
        }

        default: {
            // TypeScript exhaustiveness check
            const _exhaustive: never = expr;
            throw new Error(`Unknown expression type: ${JSON.stringify(_exhaustive)}`);
        }
    }
}

/**
 * Resolve single unit to pixels
 */
function resolveUnit(unit: LayoutUnit, containerSize: number, screenSize?: number): number {
    switch (unit.type) {
        case 'zero':
            return 0;

        case 'fraction':
            return (containerSize * unit.numerator) / unit.denominator;

        case 'percentage':
            return containerSize * unit.value;

        case 'pixel':
            // When screenSize is provided, we're rendering on miniature display
            // Scale down pixel values to maintain proportions
            // Example: 100px on 1920px screen → 100 * (300/1920) = 15.6px on miniature
            if (screenSize !== undefined) {
                return unit.value * (containerSize / screenSize);
            }
            // When screenSize is not provided, use pixel values as-is (actual window positioning)
            return unit.value;

        default: {
            // TypeScript exhaustiveness check
            const _exhaustive: never = unit;
            throw new Error(`Unknown unit type: ${JSON.stringify(_exhaustive)}`);
        }
    }
}
