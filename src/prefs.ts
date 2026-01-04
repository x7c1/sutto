/// <reference path="./types/build-mode.d.ts" />

import type Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { buildPreferencesUI } from './settings/preferences.js';

const SCHEMA_ID = 'org.gnome.shell.extensions.snappa';

export default class SnappaPreferences extends ExtensionPreferences {
  async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
    const settings = this.loadSettings();
    if (!settings) {
      console.log(
        '[Snappa Prefs] ERROR: Failed to load settings, preferences UI will not be created'
      );
      return;
    }

    buildPreferencesUI(window, settings);
  }

  /**
   * Load GSettings schema for the extension
   */
  private loadSettings(): Gio.Settings | null {
    try {
      const schemaPath = this.findSchemaPath();
      if (!schemaPath) {
        console.log('[Snappa Prefs] ERROR: Schema directory not found');
        return null;
      }

      const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        schemaPath,
        Gio.SettingsSchemaSource.get_default(),
        false
      );

      const schema = schemaSource.lookup(SCHEMA_ID, false);
      if (!schema) {
        console.log('[Snappa Prefs] ERROR: Schema not found');
        return null;
      }

      return new Gio.Settings({ settings_schema: schema });
    } catch (e) {
      console.log(`[Snappa Prefs] ERROR: Failed to load settings: ${e}`);
      return null;
    }
  }

  /**
   * Find the schema directory by trying multiple candidate paths
   */
  private findSchemaPath(): string | null {
    const candidatePaths = [
      `/tmp/${this.metadata.uuid}/schemas`,
      `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${this.metadata.uuid}/schemas`,
    ];

    for (const path of candidatePaths) {
      if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
        return path;
      }
    }

    return null;
  }
}
