/**
 * Layout Rectangle Resolver Tests
 */

import { describe, expect, it } from 'vitest';
import { type RectExpressions, resolveRect } from './rect';

function column(x: string, width: string): RectExpressions {
  return { position: { x, y: '0' }, size: { width, height: '100%' } };
}

function row(y: string, height: string): RectExpressions {
  return { position: { x: '0', y }, size: { width: '100%', height } };
}

describe('resolveRect', () => {
  it('resolves position and size to pixels', () => {
    const rect = resolveRect(
      { position: { x: '1/2', y: '0' }, size: { width: '1/2', height: '100%' } },
      { width: 300, height: 200 }
    );
    expect(rect).toEqual({ x: 150, y: 0, width: 150, height: 200 });
  });

  // Rounding x and width independently gives x=33,w=33 (ends at 66) then x=67: a 1px gap
  it('leaves no gap between thirds when the container is not divisible', () => {
    const container = { width: 100, height: 50 };
    const thirds = [column('0', '1/3'), column('1/3', '1/3'), column('2/3', '1/3')].map((layout) =>
      resolveRect(layout, container)
    );

    expect(thirds[0].x + thirds[0].width).toBe(thirds[1].x);
    expect(thirds[1].x + thirds[1].width).toBe(thirds[2].x);
  });

  // Rounding x and width independently gives x=67,w=67 (ends at 134) then x=133: a 1px overlap
  it('leaves no overlap between thirds when the container is not divisible', () => {
    const container = { width: 200, height: 50 };
    const thirds = [column('0', '1/3'), column('1/3', '1/3'), column('2/3', '1/3')].map((layout) =>
      resolveRect(layout, container)
    );

    expect(thirds[0].x + thirds[0].width).toBe(thirds[1].x);
    expect(thirds[1].x + thirds[1].width).toBe(thirds[2].x);
  });

  it('shares vertical boundaries as well', () => {
    const container = { width: 50, height: 100 };
    const rows = [row('0', '1/3'), row('1/3', '1/3'), row('2/3', '1/3')].map((layout) =>
      resolveRect(layout, container)
    );

    expect(rows[0].y + rows[0].height).toBe(rows[1].y);
    expect(rows[1].y + rows[1].height).toBe(rows[2].y);
  });

  it('ends the last layout exactly at the container edge', () => {
    const container = { width: 173, height: 97 };

    const lastColumn = resolveRect(column('2/3', '1/3'), container);
    expect(lastColumn.x + lastColumn.width).toBe(173);

    const lastRow = resolveRect(row('2/3', '1/3'), container);
    expect(lastRow.y + lastRow.height).toBe(97);
  });

  it('scales fixed pixel values when the screen size is given', () => {
    const rect = resolveRect(
      { position: { x: '192px', y: '108px' }, size: { width: '960px', height: '540px' } },
      { width: 200, height: 100 },
      { width: 1920, height: 1080 }
    );
    expect(rect).toEqual({ x: 20, y: 10, width: 100, height: 50 });
  });

  it('uses fixed pixel values as-is without a screen size', () => {
    const rect = resolveRect(
      { position: { x: '10px', y: '20px' }, size: { width: '100% - 20px', height: '300px' } },
      { width: 1366, height: 768 }
    );
    expect(rect).toEqual({ x: 10, y: 20, width: 1346, height: 300 });
  });
});
