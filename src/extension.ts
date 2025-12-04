/// <reference path="./types/gnome-shell-42.d.ts" />
/// <reference path="./types/build-mode.d.ts" />

import { Controller } from './app/controller';
import { DBusReloader } from './reloader/dbus-reloader';

// Extension class
class Extension {
  private dbusReloader: DBusReloader | null;
  private controller: Controller;

  constructor(metadata: ExtensionMetadata) {
    // Initialize DBusReloader only in development mode
    this.dbusReloader = __DEV__ ? new DBusReloader('snappa@x7c1.github.io', metadata.uuid) : null;
    this.controller = new Controller();
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
