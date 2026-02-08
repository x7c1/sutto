/**
 * GSettings-based repository for user preferences
 * (keyboard shortcuts, active collection, etc.)
 */

import Gio from 'gi://Gio';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';

export class GSettingsPreferencesRepository {
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
    const schema = schemaSource.lookup('org.gnome.shell.extensions.sutto', false);

    if (!schema) {
      throw new Error('GSettings schema not found for Sutto extension');
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
   * Get the keyboard shortcut for opening preferences while main panel is visible
   * @returns Array of shortcut strings (typically ['<Control>comma'])
   */
  getOpenPreferencesShortcut(): string[] {
    return this.settings.get_strv('open-preferences-shortcut');
  }

  /**
   * Get the raw GSettings object (needed for keybinding registration)
   * @returns Gio.Settings object
   */
  getGSettings(): Gio.Settings {
    return this.settings;
  }

  /**
   * Get the active SpaceCollection ID
   * @returns The ID of the active SpaceCollection, or empty string if not set
   */
  getActiveSpaceCollectionId(): string {
    return this.settings.get_string('active-space-collection-id');
  }

  /**
   * Set the active SpaceCollection ID
   * @param id The ID of the SpaceCollection to set as active
   */
  setActiveSpaceCollectionId(id: string): void {
    this.settings.set_string('active-space-collection-id', id);
  }
}
