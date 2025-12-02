/**
 * Layout Expression Evaluator Tests
 */

import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluator';
import { parse } from './parser';

describe('LayoutExpressionEvaluator', () => {
  const DISPLAY_WIDTH = 300; // MINIATURE_DISPLAY_WIDTH constant

  describe('Basic units', () => {
    it('evaluates zero', () => {
      const expr = parse('0');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(0);
    });

    it('evaluates fraction', () => {
      const expr = parse('1/3');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(100);
    });

    it('evaluates fraction (1/2)', () => {
      const expr = parse('1/2');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(150);
    });

    it('evaluates fraction (2/3)', () => {
      const expr = parse('2/3');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(200);
    });

    it('evaluates percentage', () => {
      const expr = parse('50%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(150);
    });

    it('evaluates 100%', () => {
      const expr = parse('100%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(300);
    });

    it('evaluates 25%', () => {
      const expr = parse('25%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(75);
    });

    it('evaluates pixel', () => {
      const expr = parse('50px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(50);
    });

    it('evaluates zero pixel', () => {
      const expr = parse('0px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(0);
    });
  });

  describe('Composite expressions', () => {
    it('evaluates addition (percentage + pixel)', () => {
      const expr = parse('50% + 10px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(160);
    });

    it('evaluates subtraction (percentage - pixel)', () => {
      const expr = parse('100% - 50px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(250);
    });

    it('evaluates fraction + pixel', () => {
      const expr = parse('1/3 + 10px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(110);
    });

    it('evaluates fraction - pixel', () => {
      const expr = parse('1/3 - 20px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(80);
    });

    it('evaluates complex expression', () => {
      const expr = parse('100% - 50px + 10px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(260);
    });

    it('evaluates multiple subtractions', () => {
      const expr = parse('100% - 20px - 10px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(270);
    });

    it('evaluates pixel + pixel', () => {
      const expr = parse('100px + 50px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(150);
    });

    it('evaluates percentage + percentage', () => {
      const expr = parse('25% + 25%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(150);
    });
  });

  describe('Real-world scenarios', () => {
    it('evaluates centered layout (x position)', () => {
      // x: '50% - 150px' for 300px wide window
      // = 150 - 150 = 0 (left edge when centered on 300px display)
      const expr = parse('50% - 150px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(0);
    });

    it('evaluates right-aligned panel', () => {
      // x: '100% - 75px' for 75px wide panel
      // = 300 - 75 = 225
      const expr = parse('100% - 75px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(225);
    });

    it('evaluates padded layout', () => {
      // width: '100% - 20px' with 10px padding on each side
      // = 300 - 20 = 280
      const expr = parse('100% - 20px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(280);
    });

    it('evaluates padded third', () => {
      // width: '1/3 - 20px' (one third with 10px padding each side)
      // = 100 - 20 = 80
      const expr = parse('1/3 - 20px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(80);
    });

    it('evaluates centered third offset', () => {
      // x: '1/3 + 10px' (start of second third with 10px offset)
      // = 100 + 10 = 110
      const expr = parse('1/3 + 10px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(110);
    });
  });

  describe('Rounding', () => {
    it('rounds to nearest integer', () => {
      // 33.33% of 300 = 99.99 → 100
      const expr = parse('33.33%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(100);
    });

    it('rounds fraction result', () => {
      // 1/3 of 301 = 100.333... → 100
      const expr = parse('1/3');
      expect(evaluate(expr, 301)).toBe(100);
    });

    it('rounds down when closer to lower integer', () => {
      // 1/3 of 299 = 99.666... → 100
      const expr = parse('1/3');
      expect(evaluate(expr, 299)).toBe(100);
    });

    it('rounds complex expression', () => {
      // 33.33% - 0.5px = 99.99 - 0.5 = 99.49 → 99
      const expr = parse('33.33% - 0.5px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(99);
    });
  });

  describe('Different container sizes', () => {
    it('evaluates for 1920px screen width', () => {
      const expr = parse('1/3');
      expect(evaluate(expr, 1920)).toBe(640);
    });

    it('evaluates for 1080px screen height', () => {
      const expr = parse('50%');
      expect(evaluate(expr, 1080)).toBe(540);
    });

    it('evaluates complex for large screen', () => {
      // 100% - 300px for 1920px container
      const expr = parse('100% - 300px');
      expect(evaluate(expr, 1920)).toBe(1620);
    });

    it('evaluates for small container', () => {
      // 1/2 of 100px = 50px
      const expr = parse('1/2');
      expect(evaluate(expr, 100)).toBe(50);
    });
  });

  describe('Edge cases', () => {
    it('evaluates 0% to 0', () => {
      const expr = parse('0%');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(0);
    });

    it('evaluates 1/1 to container size', () => {
      const expr = parse('1/1');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(300);
    });

    it('handles zero container size', () => {
      const expr = parse('50%');
      expect(evaluate(expr, 0)).toBe(0);
    });

    it('handles very large numbers', () => {
      const expr = parse('10000px');
      expect(evaluate(expr, DISPLAY_WIDTH)).toBe(10000);
    });
  });

  describe('Pixel scaling for miniature display', () => {
    it('scales down pixel values for miniature display', () => {
      // 100px on 1920px screen → scaled down to 300px miniature
      // 100 * (300 / 1920) = 15.625 → 16
      const expr = parse('100px');
      expect(evaluate(expr, 300, 1920)).toBe(16);
    });

    it('does not scale when screenSize is not provided (actual window)', () => {
      // Actual window positioning: use pixel values as-is
      const expr = parse('100px');
      expect(evaluate(expr, 1920)).toBe(100);
    });

    it('scales in composite expressions', () => {
      // 100% - 100px on miniature
      // 300 - (100 * 300/1920) = 300 - 15.625 = 284.375 → 284
      const expr = parse('100% - 100px');
      expect(evaluate(expr, 300, 1920)).toBe(284);
    });

    it('does not affect relative values', () => {
      // Percentages and fractions are not affected by screenSize
      expect(evaluate(parse('50%'), 300, 1920)).toBe(150);
      expect(evaluate(parse('1/3'), 300, 1920)).toBe(100);
    });
  });
});
