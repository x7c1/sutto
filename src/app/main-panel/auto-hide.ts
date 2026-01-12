import GLib from 'gi://GLib';

export interface AutoHideEventIds {
  leaveEventId: number;
  enterEventId: number;
}

/**
 * Manages auto-hide behavior for the main panel
 *
 * Tracks hover state and manages the auto-hide timeout logic.
 */
export class MainPanelAutoHide {
  private isPanelHovered: boolean = false;
  private autoHideTimeoutId: number | null = null;
  private onHide: (() => void) | null = null;

  /**
   * Set callback for when panel should be hidden
   */
  setOnHide(callback: () => void): void {
    this.onHide = callback;
  }

  /**
   * Setup auto-hide event handlers on panel container
   */
  setupAutoHide(container: any, autoHideDelayMs: number): AutoHideEventIds {
    // Connect leave-event to check and start auto-hide timer
    const leaveEventId = container.connect('leave-event', () => {
      this.isPanelHovered = false;
      this.checkAndStartAutoHide(autoHideDelayMs);
      return false; // Clutter.EVENT_PROPAGATE
    });

    // Connect enter-event to cancel auto-hide timer
    const enterEventId = container.connect('enter-event', () => {
      this.isPanelHovered = true;
      this.clearAutoHideTimeout();
      return false; // Clutter.EVENT_PROPAGATE
    });

    return { leaveEventId, enterEventId };
  }

  /**
   * Update panel hover state (for external callers)
   */
  setPanelHovered(hovered: boolean): void {
    this.isPanelHovered = hovered;
  }

  /**
   * Reset hover states
   */
  resetHoverStates(): void {
    this.isPanelHovered = false;
  }

  /**
   * Check if panel is not hovered, then start auto-hide
   */
  private checkAndStartAutoHide(autoHideDelayMs: number): void {
    if (!this.isPanelHovered) {
      this.startAutoHideTimeout(autoHideDelayMs);
    }
  }

  /**
   * Start auto-hide timeout
   */
  private startAutoHideTimeout(autoHideDelayMs: number): void {
    // Clear existing timeout if any
    this.clearAutoHideTimeout();

    // Start new timeout
    this.autoHideTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, autoHideDelayMs, () => {
      // Double-check that panel is not hovered before hiding
      if (!this.isPanelHovered) {
        if (this.onHide) {
          this.onHide();
        }
      }
      this.autoHideTimeoutId = null;
      return GLib.SOURCE_REMOVE; // Don't repeat
    });
  }

  /**
   * Clear auto-hide timeout
   */
  private clearAutoHideTimeout(): void {
    if (this.autoHideTimeoutId !== null) {
      GLib.Source.remove(this.autoHideTimeoutId);
      this.autoHideTimeoutId = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearAutoHideTimeout();
    this.isPanelHovered = false;
  }
}
