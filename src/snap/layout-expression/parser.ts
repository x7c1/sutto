/**
 * Layout Expression Parser
 *
 * Parses layout expression strings into Abstract Syntax Trees (AST).
 * Supports: fractions (1/3), percentages (50%), pixels (100px), zero (0),
 * and arithmetic operations (+ and -).
 *
 * Grammar:
 *   expression := term (operator term)*
 *   operator   := '+' | '-'
 *   term       := fraction | percentage | pixel | zero
 *   fraction   := integer '/' integer
 *   percentage := number '%'
 *   pixel      := number 'px'
 *   zero       := '0'
 */

import type { LayoutExpression, LayoutUnit } from './types';

/**
 * Parse expression string to AST
 * @param expr - Expression string (e.g., "1/3", "50%", "100% - 20px")
 * @returns Parsed expression AST
 * @throws Error if expression is invalid
 */
export function parse(expr: string): LayoutExpression {
  const tokens = tokenize(expr);

  if (tokens.length === 0) {
    throw new Error('Empty expression');
  }

  // Parse first term
  let result: LayoutExpression = parseTerm(tokens[0]);

  // Process remaining operator-term pairs (left-to-right)
  for (let i = 1; i < tokens.length; i += 2) {
    const operator = tokens[i];
    const nextToken = tokens[i + 1];

    if (!nextToken) {
      throw new Error(`Incomplete expression: missing operand after '${operator}'`);
    }

    const right = parseTerm(nextToken);

    if (operator === '+') {
      result = { type: 'add', left: result, right };
    } else if (operator === '-') {
      result = { type: 'subtract', left: result, right };
    } else {
      throw new Error(`Invalid operator: '${operator}'`);
    }
  }

  return result;
}

/**
 * Tokenize expression into operators and values
 * @param expr - Expression string
 * @returns Array of tokens
 */
function tokenize(expr: string): string[] {
  // Remove whitespace and split by operators while keeping them
  const normalized = expr.trim();

  if (normalized === '') {
    return [];
  }

  // Split by + or - while keeping the operators
  // Handle negative numbers by not splitting on leading -
  const tokens: string[] = [];
  let currentToken = '';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (char === '+' || char === '-') {
      // Check if this is an operator or part of a negative number
      if (currentToken.trim() !== '') {
        tokens.push(currentToken.trim());
        tokens.push(char);
        currentToken = '';
      } else {
        // This might be a negative number at the start
        currentToken += char;
      }
    } else if (char === ' ') {
    } else {
      currentToken += char;
    }
  }

  // Add the last token
  if (currentToken.trim() !== '') {
    tokens.push(currentToken.trim());
  }

  return tokens;
}

/**
 * Parse single term (fraction, percentage, pixel, or zero)
 * @param token - Token string
 * @returns Parsed unit
 * @throws Error if token is invalid
 */
function parseTerm(token: string): LayoutUnit {
  // Zero
  if (token === '0') {
    return { type: 'zero' };
  }

  // Fraction (e.g., "1/3")
  if (token.includes('/')) {
    const parts = token.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid fraction: '${token}'`);
    }

    const numerator = Number.parseFloat(parts[0]);
    const denominator = Number.parseFloat(parts[1]);

    // Check for integer fractions only
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
      throw new Error(`Fractions must use integers: '${token}'`);
    }

    if (Number.isNaN(numerator) || Number.isNaN(denominator)) {
      throw new Error(`Invalid fraction: '${token}'`);
    }

    if (denominator === 0) {
      throw new Error(`Division by zero in fraction: '${token}'`);
    }

    return { type: 'fraction', numerator, denominator };
  }

  // Percentage (e.g., "50%")
  if (token.endsWith('%')) {
    const value = Number.parseFloat(token.slice(0, -1));

    if (Number.isNaN(value)) {
      throw new Error(`Invalid percentage: '${token}'`);
    }

    // Convert to 0-1 range
    return { type: 'percentage', value: value / 100 };
  }

  // Pixel (e.g., "100px")
  if (token.endsWith('px')) {
    const value = Number.parseFloat(token.slice(0, -2));

    if (Number.isNaN(value)) {
      throw new Error(`Invalid pixel value: '${token}'`);
    }

    return { type: 'pixel', value };
  }

  // Invalid token
  throw new Error(`Invalid term: '${token}'`);
}
