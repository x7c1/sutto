/// <reference path="./types/gnome-shell-42.d.ts" />
/// <reference path="./types/build-mode.d.ts" />

import { Controller } from './app/controller';
import { DBusReloader } from './reloader/dbus-reloader';
import { ExtensionSettings } from './settings/extension-settings';

declare function log(message: string): void;

/**
 * Initialize the extension
 * This function is called when the extension is loaded by GNOME Shell
 */
// @ts-expect-error - Called by GNOME Shell runtime
function init(metadata: ExtensionMetadata): Extension {
  return new Extension(metadata);
}

// Extension class
class Extension {
  private dbusReloader: DBusReloader | null;
  private controller: Controller;

  constructor(metadata: ExtensionMetadata) {
    this.dbusReloader = __DEV__ ? new DBusReloader('snappa@x7c1.github.io', metadata.uuid) : null;
    const settings = loadSettings(metadata);
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
 * Try to load extension settings with error handling
 */
function loadSettings(metadata: ExtensionMetadata): ExtensionSettings | null {
  try {
    log('[Snappa] Loading settings...');
    log(`[Snappa] Extension metadata: uuid=${metadata.uuid}, dir=${metadata.dir?.get_path()}`);
    const settings = new ExtensionSettings(metadata);
    log('[Snappa] Settings loaded successfully');
    return settings;
  } catch (e) {
    log(`[Snappa] ERROR: Failed to load settings: ${e}`);
    if (e instanceof Error && e.stack) {
      log(`[Snappa] Error stack: ${e.stack}`);
    }
    log('[Snappa] Extension will run without keyboard shortcut support');
    return null;
  }
}
