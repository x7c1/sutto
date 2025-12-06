// GNOME Shell Extension Preferences
// Note: GNOME Shell 42 preferences use the imports API (not ES6 imports)

const Adw = imports.gi.Adw;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

declare function log(message: string): void;

// Store extension UUID for later use
let extensionUuid: string | null = null;

// GNOME Shell calls init() first when loading preferences
function init(metadata: any) {
  log('[Snappa Prefs] ===== init() called =====');
  log(`[Snappa Prefs] UUID: ${metadata.uuid}`);
  extensionUuid = metadata.uuid;
}

// GNOME Shell calls this function to populate the preferences window
function fillPreferencesWindow(window: Adw.PreferencesWindow): void {
  log('[Snappa Prefs] ===== fillPreferencesWindow() called =====');

  if (!extensionUuid) {
    log('[Snappa Prefs] ERROR: UUID not available');
    return;
  }

  // Load settings from extension directory
  let settings: Gio.Settings | null = null;
  try {
    log('[Snappa Prefs] Loading settings schema...');
    log(`[Snappa Prefs] Extension UUID: ${extensionUuid}`);

    // Build extension directory path from UUID
    const homeDir = imports.gi.GLib.get_home_dir();
    const extensionPath = `${homeDir}/.local/share/gnome-shell/extensions/${extensionUuid}`;
    const schemaPath = `${extensionPath}/schemas`;

    log(`[Snappa Prefs] Extension path: ${extensionPath}`);
    log(`[Snappa Prefs] Schema path: ${schemaPath}`);

    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
      schemaPath,
      Gio.SettingsSchemaSource.get_default(),
      false
    );
    log('[Snappa Prefs] Created schema source');

    const schema = schemaSource.lookup('org.gnome.shell.extensions.snappa', false);
    log(`[Snappa Prefs] Schema lookup result: ${schema}`);

    if (schema) {
      log('[Snappa Prefs] Creating Gio.Settings...');
      settings = new Gio.Settings({ settings_schema: schema });
      log('[Snappa Prefs] Settings created successfully');
    } else {
      log('[Snappa Prefs] ERROR: Schema not found!');
    }
  } catch (e) {
    log(`[Snappa Prefs] Failed to load settings: ${e}`);
  }

  // Create preferences page
  const page = new Adw.PreferencesPage();
  const group = new Adw.PreferencesGroup({
    title: 'Keyboard Shortcuts',
  });

  // Create keyboard shortcut row
  const row = new Adw.ActionRow({
    title: 'Show Main Panel',
    subtitle: 'Keyboard shortcut to invoke main panel for focused window',
  });

  // Shortcut display button
  const shortcutButton = new Gtk.Button({
    valign: Gtk.Align.CENTER,
    has_frame: true,
  });

  // Load and display current shortcut
  function updateShortcutLabel() {
    if (!settings) {
      shortcutButton.set_label('Disabled');
      return;
    }

    const shortcuts = settings.get_strv('show-panel-shortcut');
    if (shortcuts.length > 0) {
      shortcutButton.set_label(shortcuts[0]);
    } else {
      shortcutButton.set_label('Disabled');
    }
  }

  updateShortcutLabel();

  log('[Snappa Prefs] Registering click handler for shortcut button');

  // Click to capture new shortcut
  const handlerId = shortcutButton.connect('clicked', () => {
    log('[Snappa Prefs] ===== CLICK HANDLER CALLED =====');
    log(`[Snappa Prefs] settings = ${settings}`);
    if (!settings) {
      log('[Snappa Prefs] ERROR: settings is null, cannot create dialog');
      return;
    }

    log('[Snappa Prefs] settings is valid, proceeding...');
    try {
      log('[Snappa Prefs] Creating dialog window...');
      // Create custom dialog window for shortcut capture
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

      log('[Snappa Prefs] Adding event controller...');
      // Capture key press
      const controller = new Gtk.EventControllerKey();
    controller.connect('key-pressed', (_: any, keyval: number, _keycode: number, state: number) => {
      // Parse key combination
      const mask = state & Gtk.accelerator_get_default_mod_mask();

      if (keyval === Gdk.KEY_Escape) {
        dialog.close();
        return true;
      }

      if (keyval === Gdk.KEY_BackSpace) {
        if (settings) {
          settings.set_strv('show-panel-shortcut', []);
          updateShortcutLabel();
        }
        dialog.close();
        return true;
      }

      // Valid shortcut must have modifier
      if (mask === 0) {
        return false;
      }

      // Format shortcut string
      const accelerator = Gtk.accelerator_name(keyval, mask);

      // Save to settings
      if (settings) {
        settings.set_strv('show-panel-shortcut', [accelerator]);
        updateShortcutLabel();
      }

      dialog.close();
      return true;
    });

      log('[Snappa Prefs] Adding controller to dialog...');
      dialog.add_controller(controller);

      log('[Snappa Prefs] Presenting dialog...');
      dialog.present();
      log('[Snappa Prefs] Dialog presented successfully');
    } catch (e) {
      log(`[Snappa Prefs] Error creating dialog: ${e}`);
    }
  });

  log(`[Snappa Prefs] Click handler registered with ID: ${handlerId}`);

  // Clear button
  const clearButton = new Gtk.Button({
    icon_name: 'edit-clear-symbolic',
    valign: Gtk.Align.CENTER,
    has_frame: false,
    tooltip_text: 'Clear shortcut',
  });

  clearButton.connect('clicked', () => {
    log('[Snappa Prefs] ===== CLEAR BUTTON CLICKED =====');
    if (settings) {
      settings.set_strv('show-panel-shortcut', []);
      updateShortcutLabel();
      log('[Snappa Prefs] Shortcut cleared');
    }
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

// Export both functions as default for esbuild
export default { init, fillPreferencesWindow };
