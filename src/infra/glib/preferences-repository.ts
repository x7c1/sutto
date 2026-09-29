/**
 * GSettings-based repository for user preferences
 * (keyboard shortcuts, active collection, etc.)
 */

import Gio from 'gi://Gio';
import type { ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';
import { CollectionId } from '../../domain/layout/index.js';

const log = (message: string): void => console.log(message);

const SHOW_TOP_BAR_INDICATOR_KEY = 'show-top-bar-indicator';

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
   * Whether the top bar indicator should be shown
   */
  isTopBarIndicatorShown(): boolean {
    return this.settings.get_boolean(SHOW_TOP_BAR_INDICATOR_KEY);
  }

  /**
   * Watch changes to the top bar indicator setting
   * @returns A function that stops watching
   */
  watchTopBarIndicatorShown(callback: (shown: boolean) => void): () => void {
    const signalId = this.settings.connect(`changed::${SHOW_TOP_BAR_INDICATOR_KEY}`, () =>
      callback(this.isTopBarIndicatorShown())
    );
    return () => this.settings.disconnect(signalId);
  }

  getActiveCollectionId(): CollectionId | null {
    const str = this.settings.get_string('active-space-collection-id');
    if (!str) return null;
    try {
      return new CollectionId(str);
    } catch {
      log(`[GSettingsPreferencesRepository] Invalid collection ID in settings: "${str}"`);
      return null;
    }
  }

  setActiveCollectionId(id: CollectionId): void {
    this.settings.set_string('active-space-collection-id', id.toString());
  }
}
