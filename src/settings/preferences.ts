declare function log(message: string): void;

// Note: GNOME Shell 42 preferences use the imports API (not ES6 imports)
const Adw = imports.gi.Adw;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;

const SCHEMA_ID = 'org.gnome.shell.extensions.snappa';
const SETTINGS_KEY_SHORTCUT = 'show-panel-shortcut';

// GNOME Shell Extension Preferences
export class Preferences {
  private extensionUuid: string;

  constructor(metadata: ExtensionMetadata) {
    this.extensionUuid = metadata.uuid;
  }

  fillWindow(window: any): void {
    const settings = loadSettings(this.extensionUuid);
    if (!settings) {
      log('[Snappa Prefs] ERROR: Failed to load settings, preferences UI will not be created');
      return;
    }

    buildPreferencesUI(window, settings);
  }
}

/**
 * Load GSettings schema for the extension
 */
function loadSettings(uuid: string): Gio.Settings | null {
  try {
    const schemaPath = findSchemaPath(uuid);
    if (!schemaPath) {
      log('[Snappa Prefs] ERROR: Schema directory not found');
      return null;
    }

    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
      schemaPath,
      Gio.SettingsSchemaSource.get_default(),
      false
    );

    const schema = schemaSource.lookup(SCHEMA_ID, false);
    if (!schema) {
      log('[Snappa Prefs] ERROR: Schema not found');
      return null;
    }

    return new Gio.Settings({ settings_schema: schema });
  } catch (e) {
    log(`[Snappa Prefs] ERROR: Failed to load settings: ${e}`);
    return null;
  }
}

/**
 * Find the schema directory by trying multiple candidate paths
 */
function findSchemaPath(uuid: string): string | null {
  const candidatePaths = [
    `/tmp/${uuid}/schemas`,
    `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${uuid}/schemas`,
  ];

  for (const path of candidatePaths) {
    if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
      return path;
    }
  }

  return null;
}

/**
 * Build the preferences UI
 */
function buildPreferencesUI(window: any, settings: any): void {
  const page = new Adw.PreferencesPage();
  const group = new Adw.PreferencesGroup({
    title: 'Keyboard Shortcuts',
  });

  const row = new Adw.ActionRow({
    title: 'Show Main Panel',
    subtitle: 'Keyboard shortcut to invoke main panel for focused window',
  });

  const shortcutButton = new Gtk.Button({
    valign: Gtk.Align.CENTER,
    has_frame: true,
  });

  // Update shortcut button label from settings
  const updateShortcutLabel = () => {
    const shortcuts = settings.get_strv(SETTINGS_KEY_SHORTCUT);
    shortcutButton.set_label(shortcuts.length > 0 ? shortcuts[0] : 'Disabled');
  };

  updateShortcutLabel();

  // Show shortcut capture dialog on button click
  shortcutButton.connect('clicked', () => {
    showShortcutDialog(window, settings, updateShortcutLabel);
  });

  // Clear button
  const clearButton = new Gtk.Button({
    icon_name: 'edit-clear-symbolic',
    valign: Gtk.Align.CENTER,
    has_frame: false,
    tooltip_text: 'Clear shortcut',
  });

  clearButton.connect('clicked', () => {
    settings.set_strv(SETTINGS_KEY_SHORTCUT, []);
    updateShortcutLabel();
  });

  const box = new Gtk.Box({
    spacing: 6,
    valign: Gtk.Align.CENTER,
  });
  box.append(shortcutButton);
  box.append(clearButton);

  row.add_suffix(box);
  group.add(row);
  page.add(group);
  window.add(page);
}

/**
 * Create and show shortcut capture dialog
 */
function showShortcutDialog(window: any, settings: any, updateCallback: () => void): void {
  const dialog = new Gtk.Window({
    transient_for: window,
    modal: true,
    title: 'Press shortcut keys',
  });

  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
  });

  const label = new Gtk.Label({
    label: 'Press Escape to cancel or BackSpace to clear',
  });

  box.append(label);
  dialog.set_child(box);

  const controller = new Gtk.EventControllerKey();
  controller.connect(
    'key-pressed',
    (_controller: unknown, keyval: number, _keycode: number, state: number) => {
      const mask = state & Gtk.accelerator_get_default_mod_mask();

      // Cancel on Escape
      if (keyval === Gdk.KEY_Escape) {
        dialog.close();
        return true;
      }

      // Clear on BackSpace
      if (keyval === Gdk.KEY_BackSpace) {
        settings.set_strv(SETTINGS_KEY_SHORTCUT, []);
        updateCallback();
        dialog.close();
        return true;
      }

      // Ignore standalone modifier keys
      if (isModifierKey(keyval)) {
        return false;
      }

      // Require at least one modifier key
      if (mask === 0) {
        return false;
      }

      // Save valid shortcut
      const accelerator = Gtk.accelerator_name(keyval, mask);
      settings.set_strv(SETTINGS_KEY_SHORTCUT, [accelerator]);
      updateCallback();
      dialog.close();
      return true;
    }
  );

  dialog.add_controller(controller);
  dialog.present();
}

/**
 * Check if a keyval represents a modifier key
 */
function isModifierKey(keyval: number): boolean {
  return (
    keyval === Gdk.KEY_Control_L ||
    keyval === Gdk.KEY_Control_R ||
    keyval === Gdk.KEY_Alt_L ||
    keyval === Gdk.KEY_Alt_R ||
    keyval === Gdk.KEY_Shift_L ||
    keyval === Gdk.KEY_Shift_R ||
    keyval === Gdk.KEY_Super_L ||
    keyval === Gdk.KEY_Super_R ||
    keyval === Gdk.KEY_Meta_L ||
    keyval === Gdk.KEY_Meta_R
  );
}
