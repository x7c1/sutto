/**
 * Extension settings manager
 * Provides access to GSettings schema for keyboard shortcuts
 */

import Gio from 'gi://Gio';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';

export class ExtensionSettings {
  private settings: Gio.Settings;

  constructor(metadata: ExtensionMetadata) {
    // Get schema from extension directory
    const schemaDir = metadata.dir.get_child('schemas');
    const schemaPath = schemaDir.get_path();
    if (!schemaPath) {
      throw new Error('Failed to get schema directory path');
    }

    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
      schemaPath,
      Gio.SettingsSchemaSource.get_default(),
      false
    );
    const schema = schemaSource.lookup('org.gnome.shell.extensions.snappa', false);

    if (!schema) {
      throw new Error('GSettings schema not found for Snappa extension');
    }

    this.settings = new Gio.Settings({ settings_schema: schema });
  }

  /**
   * Get the keyboard shortcut for showing the main panel
   * @returns Array of shortcut strings (typically one shortcut, or empty if disabled)
   */
  getShowPanelShortcut(): string[] {
    return this.settings.get_strv('show-panel-shortcut');
  }

  /**
   * Get the keyboard shortcut for hiding the main panel
   * @returns Array of shortcut strings (typically ['Escape'])
   */
  getHidePanelShortcut(): string[] {
    return this.settings.get_strv('hide-panel-shortcut');
  }

  /**
   * Get whether debug panel is enabled
   * @returns Boolean indicating if debug panel should be shown in debug mode
   */
  getDebugPanelEnabled(): boolean {
    return this.settings.get_boolean('debug-panel-enabled');
  }

  /**
   * Get the raw GSettings object (needed for keybinding registration)
   * @returns Gio.Settings object
   */
  getGSettings(): Gio.Settings {
    return this.settings;
  }
}
