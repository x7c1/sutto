/// <reference path="./types/gnome-shell-42.d.ts" />

import { ReloadButton } from './reloader/reload-button';
import { WindowSnapManager } from './snap/window-snap-manager';

// Extension class
class Extension {
    private _reloadButton: ReloadButton;
    private _windowSnapManager: WindowSnapManager;

    constructor(metadata: ExtensionMetadata) {
        this._reloadButton = new ReloadButton('snappa@x7c1.github.io', metadata.uuid);
        this._windowSnapManager = new WindowSnapManager();
    }

    enable(): void {
        this._reloadButton.enable();
        this._windowSnapManager.enable();
    }

    disable(): void {
        this._reloadButton.disable();
        this._windowSnapManager.disable();
    }
}

/**
 * Initialize the extension
 * This function is called when the extension is loaded by GNOME Shell
 */
// @ts-expect-error - Called by GNOME Shell runtime
function init(metadata: ExtensionMetadata): Extension {
    return new Extension(metadata);
}
