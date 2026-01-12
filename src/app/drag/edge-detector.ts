/**
 * EdgeDetector
 *
 * Detects if cursor is at screen edge.
 * Handles edge threshold calculation for all four edges.
 */

import type { Monitor, Position } from '../types/index.js';

export class EdgeDetector {
  constructor(private readonly edgeThreshold: number) {}

  /**
   * Check if cursor is at screen edge
   */
  isAtScreenEdge(cursor: Position, monitor: Monitor | null): boolean {
    if (!monitor) {
      return false;
    }

    const { geometry } = monitor;

    const atLeft = cursor.x <= geometry.x + this.edgeThreshold;
    const atRight = cursor.x >= geometry.x + geometry.width - this.edgeThreshold;
    const atTop = cursor.y <= geometry.y + this.edgeThreshold;
    const atBottom = cursor.y >= geometry.y + geometry.height - this.edgeThreshold;

    return atLeft || atRight || atTop || atBottom;
  }
}
