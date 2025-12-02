/// <reference path="../types/gnome-shell-42.d.ts" />

export interface AutoHideEventIds {
  leaveEventId: number;
  enterEventId: number;
}

/**
 * Manages auto-hide behavior for the snap menu
 *
 * Coordinates hover states between the menu and debug panel,
 * and manages the auto-hide timeout logic.
 */
export class SnapMenuAutoHide {
  private isMenuHovered: boolean = false;
  private isDebugPanelHovered: boolean = false;
  private autoHideTimeoutId: number | null = null;
  private onHide: (() => void) | null = null;

  /**
   * Set callback for when menu should be hidden
   */
  setOnHide(callback: () => void): void {
    this.onHide = callback;
  }

  /**
   * Setup auto-hide event handlers on menu container
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setupAutoHide(container: any, autoHideDelayMs: number): AutoHideEventIds {
    // Connect leave-event to check and start auto-hide timer
    const leaveEventId = container.connect('leave-event', () => {
      this.isMenuHovered = false;
      this.checkAndStartAutoHide(autoHideDelayMs);
      return false; // Clutter.EVENT_PROPAGATE
    });

    // Connect enter-event to cancel auto-hide timer
    const enterEventId = container.connect('enter-event', () => {
      this.isMenuHovered = true;
      this.clearAutoHideTimeout();
      return false; // Clutter.EVENT_PROPAGATE
    });

    return { leaveEventId, enterEventId };
  }

  /**
   * Update menu hover state (for external callers)
   */
  setMenuHovered(hovered: boolean): void {
    this.isMenuHovered = hovered;
  }

  /**
   * Update debug panel hover state
   */
  setDebugPanelHovered(hovered: boolean, autoHideDelayMs: number): void {
    this.isDebugPanelHovered = hovered;
    if (!hovered) {
      this.checkAndStartAutoHide(autoHideDelayMs);
    } else {
      this.clearAutoHideTimeout();
    }
  }

  /**
   * Reset hover states
   */
  resetHoverStates(): void {
    this.isMenuHovered = false;
    this.isDebugPanelHovered = false;
  }

  /**
   * Check if both menu and debug panel are not hovered, then start auto-hide
   */
  private checkAndStartAutoHide(autoHideDelayMs: number): void {
    // Only start auto-hide if both menu and debug panel are not hovered
    if (!this.isMenuHovered && !this.isDebugPanelHovered) {
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
    this.autoHideTimeoutId = imports.mainloop.timeout_add(autoHideDelayMs, () => {
      // Double-check that neither menu nor debug panel is hovered before hiding
      if (!this.isMenuHovered && !this.isDebugPanelHovered) {
        if (this.onHide) {
          this.onHide();
        }
      }
      this.autoHideTimeoutId = null;
      return false; // Don't repeat
    });
  }

  /**
   * Clear auto-hide timeout
   */
  private clearAutoHideTimeout(): void {
    if (this.autoHideTimeoutId !== null) {
      imports.mainloop.source_remove(this.autoHideTimeoutId);
      this.autoHideTimeoutId = null;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.clearAutoHideTimeout();
    this.isMenuHovered = false;
    this.isDebugPanelHovered = false;
  }
}
