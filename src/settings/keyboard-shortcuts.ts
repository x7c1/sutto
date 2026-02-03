import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { createLicenseGroup } from './license-ui.js';

const SETTINGS_KEY_SHOW_PANEL = 'show-panel-shortcut';
const SETTINGS_KEY_OPEN_PREFERENCES = 'open-preferences-shortcut';

/**
 * Create the General preferences page with keyboard shortcut settings
 */
export function createGeneralPage(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings
): Adw.PreferencesPage {
  const page = new Adw.PreferencesPage({
    title: 'General',
    icon_name: 'preferences-system-symbolic',
  });

  const group = new Adw.PreferencesGroup({
    title: 'Keyboard Shortcuts',
  });

  // Show Main Panel shortcut
  const showPanelRow = createShortcutRow(
    window,
    settings,
    SETTINGS_KEY_SHOW_PANEL,
    'Show Main Panel',
    'Keyboard shortcut to invoke main panel for focused window'
  );
  group.add(showPanelRow);

  // Open Preferences shortcut
  const openPrefsRow = createShortcutRow(
    window,
    settings,
    SETTINGS_KEY_OPEN_PREFERENCES,
    'Open Preferences',
    'Keyboard shortcut to open preferences while main panel is visible'
  );
  group.add(openPrefsRow);

  page.add(group);

  // Add License group
  const licenseGroup = createLicenseGroup(window, settings);
  page.add(licenseGroup);

  return page;
}

/**
 * Create a shortcut configuration row
 */
function createShortcutRow(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings,
  settingsKey: string,
  title: string,
  subtitle: string
): Adw.ActionRow {
  const row = new Adw.ActionRow({ title, subtitle });

  const shortcutButton = new Gtk.Button({
    valign: Gtk.Align.CENTER,
    has_frame: true,
  });

  const updateLabel = () => {
    const shortcuts = settings.get_strv(settingsKey);
    shortcutButton.set_label(shortcuts.length > 0 ? shortcuts[0] : 'Disabled');
  };

  updateLabel();

  shortcutButton.connect('clicked', () => {
    showShortcutDialog(window, settings, settingsKey, updateLabel);
  });

  const clearButton = new Gtk.Button({
    icon_name: 'edit-clear-symbolic',
    valign: Gtk.Align.CENTER,
    has_frame: false,
    tooltip_text: 'Clear shortcut',
  });

  clearButton.connect('clicked', () => {
    settings.set_strv(settingsKey, []);
    updateLabel();
  });

  const box = new Gtk.Box({
    spacing: 6,
    valign: Gtk.Align.CENTER,
  });
  box.append(shortcutButton);
  box.append(clearButton);

  row.add_suffix(box);
  return row;
}

/**
 * Create and show shortcut capture dialog
 */
function showShortcutDialog(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings,
  settingsKey: string,
  updateCallback: () => void
): void {
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
    margin_top: 12,
    margin_bottom: 12,
    margin_start: 12,
    margin_end: 12,
  });

  box.append(label);
  dialog.set_child(box);

  const controller = new Gtk.EventControllerKey();
  controller.connect(
    'key-pressed',
    (_controller: unknown, keyval: number, _keycode: number, state: number) => {
      const mask = state & Gtk.accelerator_get_default_mod_mask();

      if (keyval === Gdk.KEY_Escape) {
        dialog.close();
        return true;
      }

      if (keyval === Gdk.KEY_BackSpace) {
        settings.set_strv(settingsKey, []);
        updateCallback();
        dialog.close();
        return true;
      }

      if (isModifierKey(keyval)) {
        return false;
      }

      if (mask === 0) {
        return false;
      }

      const accelerator = Gtk.accelerator_name(keyval, mask);
      settings.set_strv(settingsKey, [accelerator]);
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
