/// <reference path="../types/build-mode.d.ts" />

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

const SETTINGS_KEY_SHORTCUT = 'show-panel-shortcut';

/**
 * Build the preferences UI
 */
export function buildPreferencesUI(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
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

  // Debug settings (only visible in debug builds)
  if (__DEV__) {
    const debugGroup = new Adw.PreferencesGroup({
      title: 'Debug Settings',
    });

    const debugRow = new Adw.ActionRow({
      title: 'Show Debug Panel',
      subtitle: 'Display debug panel when in debug mode',
    });

    const debugSwitch = new Gtk.Switch({
      valign: Gtk.Align.CENTER,
    });

    // Bind switch to settings
    settings.bind('debug-panel-enabled', debugSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    debugRow.add_suffix(debugSwitch);
    debugRow.activatable_widget = debugSwitch;
    debugGroup.add(debugRow);
    page.add(debugGroup);
  }

  window.add(page);
}

/**
 * Create and show shortcut capture dialog
 */
function showShortcutDialog(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings,
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
