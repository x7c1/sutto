/**
 * Extension settings manager
 * Provides access to GSettings schema for keyboard shortcuts
 */

/// <reference path="../types/gnome-shell-42.d.ts" />

export class ExtensionSettings {
  private settings: Gio.Settings;

  constructor(metadata: ExtensionMetadata) {
    // Get schema from extension directory
    const schemaDir = metadata.dir.get_child('schemas');
    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
      schemaDir.get_path(),
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
   * Get the raw GSettings object (needed for keybinding registration)
   * @returns Gio.Settings object
   */
  getGSettings(): Gio.Settings {
    return this.settings;
  }
}
