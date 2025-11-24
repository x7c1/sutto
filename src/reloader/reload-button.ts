/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Reload Button for GNOME Shell Extension Development
 *
 * A panel button that provides hot-reload functionality during development.
 * Simply add this to your extension to enable instant reloading.
 *
 * Usage:
 *   class Extension {
 *       private _reloadButton: ReloadButton;
 *
 *       constructor(metadata: ExtensionMetadata) {
 *           this._reloadButton = new ReloadButton('my-ext@example.com', metadata.uuid);
 *       }
 *
 *       enable() {
 *           this._reloadButton.enable();
 *       }
 *
 *       disable() {
 *           this._reloadButton.disable();
 *       }
 *   }
 */

// Import required modules
const St = imports.gi.St;
const Main = imports.ui.main as any as Main;

import { Reloader } from './reloader';

export class ReloadButton {
    private _button: St.Button | null;
    private _reloader: Reloader;

    /**
     * Create a new ReloadButton instance
     * @param originalUuid The extension's original UUID
     * @param currentUuid The current UUID (for reloaded instances)
     * @param label Optional button label (default: 'Reload')
     */
    constructor(originalUuid: string, currentUuid?: string, label: string = 'Reload') {
        this._button = null;
        this._reloader = new Reloader(originalUuid, currentUuid);
        this._label = label;
    }

    private _label: string;

    /**
     * Enable the reload button (add to panel)
     */
    enable(): void {
        // Create button
        const button = new St.Button({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Create label
        const label = new St.Label({
            text: this._label,
            y_align: 2, // CENTER
        });
        button.set_child(label);

        // Connect click event to reload function
        button.connect('button-press-event', () => {
            this._reloader.reload();
            return true; // Clutter.EVENT_STOP
        });

        // Add button to the panel (top bar)
        Main.panel._rightBox.insert_child_at_index(button, 0);
        this._button = button;
    }

    /**
     * Disable the reload button (remove from panel)
     */
    disable(): void {
        if (this._button) {
            Main.panel._rightBox.remove_child(this._button);
            this._button.destroy();
            this._button = null;
        }
    }
}
