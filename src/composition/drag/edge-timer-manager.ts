/**
 * EdgeTimerManager
 *
 * Manages the delay timer before showing panel when cursor reaches edge.
 * Handles timer creation and cancellation.
 */

import GLib from 'gi://GLib';

export class EdgeTimerManager {
  private edgeTimer: number | null = null;

  constructor(private readonly edgeDelayMs: number) {}

  /**
   * Start edge delay timer
   */
  start(onTimeout: () => void): void {
    this.clear();

    this.edgeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.edgeDelayMs, () => {
      onTimeout();
      this.edgeTimer = null;
      return false; // Don't repeat
    });
  }

  /**
   * Clear edge delay timer
   */
  clear(): void {
    if (this.edgeTimer !== null) {
      GLib.Source.remove(this.edgeTimer);
      this.edgeTimer = null;
    }
  }

  /**
   * Check if timer is active
   */
  isActive(): boolean {
    return this.edgeTimer !== null;
  }
}
