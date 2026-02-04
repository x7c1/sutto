/**
 * MotionMonitor
 *
 * Monitors cursor motion during window dragging.
 * Periodically checks cursor position and triggers callback.
 */

import GLib from 'gi://GLib';

export class MotionMonitor {
  private motionId: number | null = null;

  constructor(private readonly monitorIntervalMs: number) {}

  /**
   * Start monitoring cursor motion
   */
  start(onMotion: () => boolean): void {
    if (this.motionId !== null) {
      return;
    }

    this.motionId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, this.monitorIntervalMs, () => {
      const shouldContinue = onMotion();
      if (!shouldContinue) {
        this.motionId = null;
      }
      return shouldContinue;
    });
  }

  /**
   * Stop monitoring cursor motion
   */
  stop(): void {
    if (this.motionId !== null) {
      GLib.Source.remove(this.motionId);
      this.motionId = null;
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.motionId !== null;
  }
}
