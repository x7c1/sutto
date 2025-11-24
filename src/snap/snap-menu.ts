/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with preset buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Main = imports.ui.main;

declare function log(message: string): void;

const MENU_WIDTH = 300;
const MENU_HEIGHT = 300;
const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding menu when cursor leaves

export interface SnapPreset {
    label: string;
    x: number; // percentage of screen width (0-1)
    y: number; // percentage of screen height (0-1)
    width: number; // percentage of screen width (0-1)
    height: number; // percentage of screen height (0-1)
}

export class SnapMenu {
    private _container: St.BoxLayout | null = null;
    private _presets: SnapPreset[] = [];
    private _onPresetSelected: ((preset: SnapPreset) => void) | null = null;
    private _presetButtons: Map<St.Button, SnapPreset> = new Map();
    private _clickOutsideId: number | null = null;
    private _autoHideTimeoutId: number | null = null;
    private _leaveEventId: number | null = null;
    private _enterEventId: number | null = null;

    constructor() {
        // Initialize with default presets
        this._presets = [
            {
                label: 'Left Half',
                x: 0,
                y: 0,
                width: 0.5,
                height: 1,
            },
            {
                label: 'Right Half',
                x: 0.5,
                y: 0,
                width: 0.5,
                height: 1,
            },
        ];
    }

    /**
     * Set callback for when a preset is selected
     */
    setOnPresetSelected(callback: (preset: SnapPreset) => void): void {
        this._onPresetSelected = callback;
    }

    /**
     * Show the snap menu at the specified position
     */
    show(x: number, y: number): void {
        // Hide existing menu if any
        this.hide();

        // Clear preset buttons map
        this._presetButtons.clear();

        // Create container
        this._container = new St.BoxLayout({
            style_class: 'snap-menu',
            style: `
                background-color: rgba(40, 40, 40, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px;
            `,
            vertical: true,
            width: MENU_WIDTH,
            height: MENU_HEIGHT,
            visible: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Add title
        const title = new St.Label({
            text: 'Snap Window',
            style: `
                font-size: 16px;
                font-weight: bold;
                color: white;
                margin-bottom: 12px;
            `,
            x_align: 2, // CENTER
        });
        this._container.add_child(title);

        // Add preset buttons
        for (const preset of this._presets) {
            const button = this._createPresetButton(preset);
            this._presetButtons.set(button, preset);
            this._container.add_child(button);
        }

        // Add cancel button
        const cancelButton = this._createCancelButton();
        this._container.add_child(cancelButton);

        // Add invisible background to capture clicks outside menu
        const background = new St.BoxLayout({
            style: 'background-color: rgba(0, 0, 0, 0);',
            reactive: true,
            x: 0,
            y: 0,
            width: global.screen_width,
            height: global.screen_height,
        });

        // Add background first (behind menu)
        Main.layoutManager.addChrome(background, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Connect click on background to close menu
        this._clickOutsideId = background.connect('button-press-event', () => {
            log('[SnapMenu] Click on background, hiding menu');
            this.hide();
            return true; // Stop event propagation
        });

        // Position menu at cursor
        this._container.set_position(x, y);

        // Add menu container separately (on top of background)
        Main.layoutManager.addChrome(this._container, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Store background reference for cleanup
        (this._container as any)._background = background;

        // Setup auto-hide on mouse leave
        this._setupAutoHide();
    }

    /**
     * Hide the snap menu
     */
    hide(): void {
        if (this._container) {
            const background = (this._container as any)._background;

            // Clear auto-hide timeout
            this._clearAutoHideTimeout();

            // Disconnect event handlers
            if (this._clickOutsideId !== null && background) {
                background.disconnect(this._clickOutsideId);
                this._clickOutsideId = null;
            }
            if (this._leaveEventId !== null && this._container) {
                this._container.disconnect(this._leaveEventId);
                this._leaveEventId = null;
            }
            if (this._enterEventId !== null && this._container) {
                this._container.disconnect(this._enterEventId);
                this._enterEventId = null;
            }

            // Remove menu container
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();

            // Remove background
            if (background) {
                Main.layoutManager.removeChrome(background);
                background.destroy();
            }

            this._container = null;
        }
    }

    /**
     * Check if menu is currently shown
     */
    isVisible(): boolean {
        return this._container !== null;
    }

    /**
     * Update menu position (for following cursor during drag)
     */
    updatePosition(x: number, y: number): void {
        if (this._container) {
            this._container.set_position(x, y);
        }
    }

    /**
     * Get preset at the given position, or null if position is not over a preset button
     */
    getPresetAtPosition(x: number, y: number): SnapPreset | null {
        if (!this._container) {
            return null;
        }

        // Check each preset button to see if position is within its bounds
        for (const [button, preset] of this._presetButtons.entries()) {
            const [actorX, actorY] = button.get_transformed_position();
            const [width, height] = button.get_transformed_size();

            if (x >= actorX && x <= actorX + width && y >= actorY && y <= actorY + height) {
                log(`[SnapMenu] Position (${x}, ${y}) is over preset: ${preset.label}`);
                return preset;
            }
        }

        log(`[SnapMenu] Position (${x}, ${y}) is not over any preset`);
        return null;
    }

    /**
     * Create a preset button
     */
    private _createPresetButton(preset: SnapPreset): St.Button {
        const button = new St.Button({
            style_class: 'snap-menu-button',
            style: `
                background-color: rgba(60, 60, 60, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                padding: 12px 20px;
                margin: 4px 0;
            `,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        const label = new St.Label({
            text: preset.label,
            style: `
                color: white;
                font-size: 14px;
            `,
            x_align: 2, // CENTER
        });
        button.set_child(label);

        // Connect click event
        button.connect('button-press-event', () => {
            log(`[SnapMenu] Button clicked: ${preset.label}`);
            if (this._onPresetSelected) {
                this._onPresetSelected(preset);
            }
            this.hide();
            return true; // Clutter.EVENT_STOP
        });

        return button;
    }

    /**
     * Setup auto-hide behavior when cursor leaves menu
     */
    private _setupAutoHide(): void {
        if (!this._container) {
            return;
        }

        // Connect leave-event to start auto-hide timer
        this._leaveEventId = this._container.connect('leave-event', () => {
            log('[SnapMenu] Cursor left menu, starting auto-hide timer');
            this._startAutoHideTimeout();
            return false; // Clutter.EVENT_PROPAGATE
        });

        // Connect enter-event to cancel auto-hide timer
        this._enterEventId = this._container.connect('enter-event', () => {
            log('[SnapMenu] Cursor entered menu, canceling auto-hide timer');
            this._clearAutoHideTimeout();
            return false; // Clutter.EVENT_PROPAGATE
        });
    }

    /**
     * Start auto-hide timeout
     */
    private _startAutoHideTimeout(): void {
        // Clear existing timeout if any
        this._clearAutoHideTimeout();

        // Start new timeout
        this._autoHideTimeoutId = imports.mainloop.timeout_add(AUTO_HIDE_DELAY_MS, () => {
            log('[SnapMenu] Auto-hide timeout expired, hiding menu');
            this.hide();
            this._autoHideTimeoutId = null;
            return false; // Don't repeat
        });
    }

    /**
     * Clear auto-hide timeout
     */
    private _clearAutoHideTimeout(): void {
        if (this._autoHideTimeoutId !== null) {
            log('[SnapMenu] Clearing auto-hide timeout');
            imports.mainloop.source_remove(this._autoHideTimeoutId);
            this._autoHideTimeoutId = null;
        }
    }

    /**
     * Create cancel button
     */
    private _createCancelButton(): St.Button {
        const button = new St.Button({
            style_class: 'snap-menu-cancel-button',
            style: `
                background-color: rgba(80, 80, 80, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                padding: 8px 16px;
                margin-top: 12px;
            `,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        const label = new St.Label({
            text: 'Cancel',
            style: `
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
            `,
            x_align: 2, // CENTER
        });
        button.set_child(label);

        // Connect click event
        button.connect('button-press-event', () => {
            this.hide();
            return true; // Clutter.EVENT_STOP
        });

        return button;
    }
}

