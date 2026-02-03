/// <reference path="./types/build-mode.d.ts" />

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { EXTENSION_UUID } from './app/constants.js';
import { Controller } from './app/controller.js';
import { DBusReloader } from './infra/reloader/index.js';
import { ExtensionSettings } from './prefs/extension-settings.js';

export default class SnappaExtension extends Extension {
  private dbusReloader: DBusReloader | null = null;
  private controller: Controller | null = null;

  enable() {
    console.log('[Snappa] Extension enabled');

    this.dbusReloader = this.initializeDBusReloader();
    this.dbusReloader?.enable();

    this.controller = this.initializeController();
    this.controller?.enable();
  }

  disable() {
    console.log('[Snappa] Extension disabled');

    // Clean up controller
    this.controller?.disable();
    this.controller = null;

    // Clean up D-Bus reloader
    this.dbusReloader?.disable();
    this.dbusReloader = null;
  }

  private initializeDBusReloader(): DBusReloader | null {
    if (!__DEV__) {
      return null;
    }
    try {
      return new DBusReloader(EXTENSION_UUID, this.metadata.uuid);
    } catch (e) {
      console.log(`[Snappa] ERROR: Failed to initialize DBusReloader: ${e}`);
      return null;
    }
  }

  private initializeSettings(): ExtensionSettings | null {
    try {
      return new ExtensionSettings(this.metadata);
    } catch (e) {
      console.log(`[Snappa] ERROR: Failed to initialize settings: ${e}`);
      return null;
    }
  }

  private initializeController(): Controller | null {
    const settings = this.initializeSettings();
    if (!settings) {
      return null;
    }
    try {
      return new Controller(settings, this.metadata);
    } catch (e) {
      console.log(`[Snappa] ERROR: Failed to initialize controller: ${e}`);
      return null;
    }
  }
}
