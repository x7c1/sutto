/// <reference path="./libs/gnome-types/build-mode.d.ts" />

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { Controller } from './composition/controller.js';
import { EXTENSION_UUID } from './infra/constants.js';
import { GSettingsPreferencesRepository } from './infra/glib/index.js';
import { DBusReloader } from './libs/reloader/index.js';

export default class SuttoExtension extends Extension {
  private dbusReloader: DBusReloader | null = null;
  private controller: Controller | null = null;

  enable() {
    console.log('[Sutto] Extension enabled');

    this.dbusReloader = this.initializeDBusReloader();
    this.dbusReloader?.enable();

    this.controller = this.initializeController();
    this.controller?.enable();
  }

  disable() {
    console.log('[Sutto] Extension disabled');

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
      console.log(`[Sutto] ERROR: Failed to initialize DBusReloader: ${e}`);
      return null;
    }
  }

  private initializePreferencesRepository(): GSettingsPreferencesRepository | null {
    try {
      return new GSettingsPreferencesRepository(this.metadata);
    } catch (e) {
      console.log(`[Sutto] ERROR: Failed to initialize preferences repository: ${e}`);
      return null;
    }
  }

  private initializeController(): Controller | null {
    const preferencesRepository = this.initializePreferencesRepository();
    if (!preferencesRepository) {
      return null;
    }
    try {
      return new Controller(preferencesRepository, this.metadata);
    } catch (e) {
      console.log(`[Sutto] ERROR: Failed to initialize controller: ${e}`);
      return null;
    }
  }
}
