/// <reference path="./types/gnome-shell-42.d.ts" />

import { ReloadButton } from './reloader/reload-button';

// Type definitions for GJS extension API
interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    'shell-version': string[];
    url: string;
    version: number;
}

// Extension class
class Extension {
    private _reloadButton: ReloadButton;

    constructor(metadata: ExtensionMetadata) {
        this._reloadButton = new ReloadButton('snappa@x7c1.github.io', metadata.uuid);
    }

    enable(): void {
        this._reloadButton.enable();
    }

    disable(): void {
        this._reloadButton.disable();
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
