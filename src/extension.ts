/// <reference path="./types/gnome-shell-42.d.ts" />
/// <reference path="./types/build-mode.d.ts" />

import { Controller } from './app/controller';
import { DBusReloader } from './reloader/dbus-reloader';
import { ExtensionSettings } from './settings/extension-settings';

// Extension class
class Extension {
  private dbusReloader: DBusReloader | null;
  private controller: Controller;

  constructor(metadata: ExtensionMetadata) {
    // Initialize DBusReloader only in development mode (before settings to ensure it always works)
    this.dbusReloader = __DEV__ ? new DBusReloader('snappa@x7c1.github.io', metadata.uuid) : null;

    // Initialize settings (with error handling)
    let settings: ExtensionSettings | null = null;
    try {
      settings = new ExtensionSettings(metadata);
    } catch (e) {
      // @ts-expect-error - log exists in GJS runtime
      log(`[Snappa] Failed to load settings: ${e}`);
      // @ts-expect-error - log exists in GJS runtime
      log('[Snappa] Extension will run without keyboard shortcut support');
    }

    // Initialize controller with settings and metadata
    this.controller = new Controller(settings, metadata);
  }

  enable(): void {
    this.dbusReloader?.enable();
    this.controller.enable();
  }

  disable(): void {
    this.dbusReloader?.disable();
    this.controller.disable();
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
