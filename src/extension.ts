/// <reference path="./types/build-mode.d.ts" />

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {DBusReloader} from './reloader/dbus-reloader.js';
import {ExtensionSettings} from './settings/extension-settings.js';
import {Controller} from './app/controller.js';

export default class SnappaExtension extends Extension {
  private dbusReloader: DBusReloader | null = null;
  private settings: ExtensionSettings | null = null;
  private controller: Controller | null = null;

  enable() {
    console.log('[Snappa] Extension enabled');

    // Initialize D-Bus reloader in development mode
    if (__DEV__) {
      this.dbusReloader = new DBusReloader('snappa@x7c1.github.io', this.metadata.uuid);
      this.dbusReloader.enable();
    }

    // Load settings
    try {
      this.settings = new ExtensionSettings(this.metadata);
      console.log('[Snappa] Settings loaded successfully');

      // Log current shortcuts for verification
      const showShortcut = this.settings.getShowPanelShortcut();
      const hideShortcut = this.settings.getHidePanelShortcut();
      console.log(`[Snappa] Show panel shortcut: ${showShortcut.join(', ') || 'None'}`);
      console.log(`[Snappa] Hide panel shortcut: ${hideShortcut.join(', ') || 'None'}`);
    } catch (e) {
      console.log(`[Snappa] ERROR: Failed to load settings: ${e}`);
      console.log('[Snappa] Extension will run without settings support');
      this.settings = null;
    }

    // Initialize controller (handles drag detection and panel display)
    try {
      this.controller = new Controller(this.settings);
      this.controller.enable();
      console.log('[Snappa] Controller initialized');
    } catch (e) {
      console.log(`[Snappa] ERROR: Failed to initialize controller: ${e}`);
      this.controller = null;
    }
  }

  disable() {
    console.log('[Snappa] Extension disabled');

    // Clean up controller
    if (this.controller) {
      this.controller.disable();
      this.controller = null;
    }

    // Clean up settings
    this.settings = null;

    // Clean up D-Bus reloader
    if (this.dbusReloader) {
      this.dbusReloader.disable();
      this.dbusReloader = null;
    }
  }
}
