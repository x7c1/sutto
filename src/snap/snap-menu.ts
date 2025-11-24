/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with preset buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;

declare function log(message: string): void;

const MENU_WIDTH = 300;
const MENU_HEIGHT = 300;

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

        // Add close button
        const closeButton = this._createCloseButton();
        this._container.add_child(closeButton);

        // Position menu at cursor
        this._container.set_position(x, y);

        // Add to global stage
        global.stage.add_child(this._container);
    }

    /**
     * Hide the snap menu
     */
    hide(): void {
        if (this._container) {
            const parent = this._container.get_parent();
            if (parent) {
                parent.remove_child(this._container);
            }
            this._container.destroy();
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

            if (
                x >= actorX &&
                x <= actorX + width &&
                y >= actorY &&
                y <= actorY + height
            ) {
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
     * Create close button
     */
    private _createCloseButton(): St.Button {
        const button = new St.Button({
            style_class: 'snap-menu-close-button',
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
            text: 'Close',
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
