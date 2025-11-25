/// <reference path="./types/gnome-shell-42.d.ts" />
/// <reference path="./types/build-mode.d.ts" />

import { DBusReloader } from './reloader/dbus-reloader';
import { WindowSnapManager } from './snap/window-snap-manager';

// Extension class
class Extension {
    private _dbusReloader: DBusReloader | null;
    private _windowSnapManager: WindowSnapManager;

    constructor(metadata: ExtensionMetadata) {
        // Initialize DBusReloader only in development mode
        this._dbusReloader = __DEV__
            ? new DBusReloader('snappa@x7c1.github.io', metadata.uuid)
            : null;
        this._windowSnapManager = new WindowSnapManager();
    }

    enable(): void {
        this._dbusReloader?.enable();
        this._windowSnapManager.enable();
    }

    disable(): void {
        this._dbusReloader?.disable();
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
