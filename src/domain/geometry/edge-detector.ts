/**
 * EdgeDetector
 *
 * Detects if a position is at the edge of a bounding rectangle.
 */

import type { Position, Rectangle } from './types.js';

export class EdgeDetector {
  constructor(private readonly edgeThreshold: number) {}

  /**
   * Check if position is at the edge of the given bounds
   */
  isAtEdge(position: Position, bounds: Rectangle): boolean {
    const atLeft = position.x <= bounds.x + this.edgeThreshold;
    const atRight = position.x >= bounds.x + bounds.width - this.edgeThreshold;
    const atTop = position.y <= bounds.y + this.edgeThreshold;
    const atBottom = position.y >= bounds.y + bounds.height - this.edgeThreshold;

    return atLeft || atRight || atTop || atBottom;
  }
}
