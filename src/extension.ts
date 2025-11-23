/// <reference path="./types/gnome-shell-42.d.ts" />

// Import GJS modules
const St = imports.gi.St;
const Main = imports.ui.main;

// Type definitions for GJS extension API
interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    'shell-version': string[];
    url: string;
    version: number;
}

// Extension class with typed properties and methods
class Extension {
    private _indicator: St.Label | null;

    constructor() {
        this._indicator = null;
    }

    /**
     * Enable the extension - called when extension is activated
     */
    enable(): void {
        // Create a label with "Hello World" text
        this._indicator = new St.Label({
            text: 'Hello World',
            style_class: 'panel-button',
            y_align: 2, // Center vertically
        });

        // Add the label to the panel (top bar)
        Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
    }

    /**
     * Disable the extension - called when extension is deactivated
     */
    disable(): void {
        // Remove the label from the panel
        if (this._indicator) {
            Main.panel._rightBox.remove_child(this._indicator);
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

/**
 * Initialize the extension
 * This function is called when the extension is loaded
 */
function init(): Extension {
    return new Extension();
}
