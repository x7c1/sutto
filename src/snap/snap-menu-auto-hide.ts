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
    private _isMenuHovered: boolean = false;
    private _isDebugPanelHovered: boolean = false;
    private _autoHideTimeoutId: number | null = null;
    private _onHide: (() => void) | null = null;

    /**
     * Set callback for when menu should be hidden
     */
    setOnHide(callback: () => void): void {
        this._onHide = callback;
    }

    /**
     * Setup auto-hide event handlers on menu container
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setupAutoHide(container: any, autoHideDelayMs: number): AutoHideEventIds {
        // Connect leave-event to check and start auto-hide timer
        const leaveEventId = container.connect('leave-event', () => {
            this._isMenuHovered = false;
            this._checkAndStartAutoHide(autoHideDelayMs);
            return false; // Clutter.EVENT_PROPAGATE
        });

        // Connect enter-event to cancel auto-hide timer
        const enterEventId = container.connect('enter-event', () => {
            this._isMenuHovered = true;
            this._clearAutoHideTimeout();
            return false; // Clutter.EVENT_PROPAGATE
        });

        return { leaveEventId, enterEventId };
    }

    /**
     * Update menu hover state (for external callers)
     */
    setMenuHovered(hovered: boolean): void {
        this._isMenuHovered = hovered;
    }

    /**
     * Update debug panel hover state
     */
    setDebugPanelHovered(hovered: boolean, autoHideDelayMs: number): void {
        this._isDebugPanelHovered = hovered;
        if (!hovered) {
            this._checkAndStartAutoHide(autoHideDelayMs);
        } else {
            this._clearAutoHideTimeout();
        }
    }

    /**
     * Reset hover states
     */
    resetHoverStates(): void {
        this._isMenuHovered = false;
        this._isDebugPanelHovered = false;
    }

    /**
     * Check if both menu and debug panel are not hovered, then start auto-hide
     */
    private _checkAndStartAutoHide(autoHideDelayMs: number): void {
        // Only start auto-hide if both menu and debug panel are not hovered
        if (!this._isMenuHovered && !this._isDebugPanelHovered) {
            this._startAutoHideTimeout(autoHideDelayMs);
        }
    }

    /**
     * Start auto-hide timeout
     */
    private _startAutoHideTimeout(autoHideDelayMs: number): void {
        // Clear existing timeout if any
        this._clearAutoHideTimeout();

        // Start new timeout
        this._autoHideTimeoutId = imports.mainloop.timeout_add(autoHideDelayMs, () => {
            // Double-check that neither menu nor debug panel is hovered before hiding
            if (!this._isMenuHovered && !this._isDebugPanelHovered) {
                if (this._onHide) {
                    this._onHide();
                }
            }
            this._autoHideTimeoutId = null;
            return false; // Don't repeat
        });
    }

    /**
     * Clear auto-hide timeout
     */
    private _clearAutoHideTimeout(): void {
        if (this._autoHideTimeoutId !== null) {
            imports.mainloop.source_remove(this._autoHideTimeoutId);
            this._autoHideTimeoutId = null;
        }
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this._clearAutoHideTimeout();
        this._isMenuHovered = false;
        this._isDebugPanelHovered = false;
    }
}
