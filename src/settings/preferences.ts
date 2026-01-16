/// <reference path="../types/build-mode.d.ts" />

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { loadLayoutsAsSpacesRows, setSpaceEnabled } from '../app/repository/spaces.js';
import type { Monitor, Space, SpacesRow } from '../app/types/index.js';
import { calculateSpaceDimensions, createGtkMiniatureSpace } from './gtk-miniature-space.js';

const SETTINGS_KEY_SHORTCUT = 'show-panel-shortcut';
const MONITORS_FILE_NAME = 'monitors.json';

// Window size constants
const MIN_WINDOW_WIDTH = 400;
const DEFAULT_WINDOW_HEIGHT = 500;
const WINDOW_HORIZONTAL_PADDING = 80;

// Spacing between spaces in a row
const SPACE_SPACING = 12;

/**
 * Build the preferences UI
 */
export function buildPreferencesUI(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
  // Load spaces and monitors for width calculation
  const rows = loadLayoutsAsSpacesRows();
  const monitors = loadMonitors(rows);

  // Calculate required width and set window size
  const contentWidth = calculateRequiredWidth(rows, monitors);
  const screenWidth = getScreenWidth();
  const windowWidth = Math.min(contentWidth + WINDOW_HORIZONTAL_PADDING, screenWidth);
  window.set_default_size(Math.max(windowWidth, MIN_WINDOW_WIDTH), DEFAULT_WINDOW_HEIGHT);

  // Create General page (existing keyboard shortcut settings)
  const generalPage = createGeneralPage(window, settings);
  window.add(generalPage);

  // Create Spaces page (reuse already loaded data)
  const spacesPage = createSpacesPageWithData(rows, monitors);
  window.add(spacesPage);
}

/**
 * Calculate the required width to display all space rows
 */
function calculateRequiredWidth(rows: SpacesRow[], monitors: Map<string, Monitor>): number {
  let maxRowWidth = 0;

  for (const row of rows) {
    if (row.spaces.length === 0) continue;

    let rowWidth = 0;
    for (const space of row.spaces) {
      const dimensions = calculateSpaceDimensions(space, monitors);
      rowWidth += dimensions.width;
    }
    // Add spacing between spaces
    rowWidth += (row.spaces.length - 1) * SPACE_SPACING;

    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  return maxRowWidth;
}

/**
 * Get the width of the primary screen/monitor
 */
function getScreenWidth(): number {
  const display = Gdk.Display.get_default();
  if (!display) {
    return 1920;
  }

  const monitorList = display.get_monitors();
  if (!monitorList || monitorList.get_n_items() === 0) {
    return 1920;
  }

  // Get the first monitor (primary)
  const monitor = monitorList.get_item(0) as Gdk.Monitor | null;
  if (!monitor) {
    return 1920;
  }

  const geometry = monitor.get_geometry();
  return geometry.width;
}

/**
 * Create the General preferences page with keyboard shortcut settings
 */
function createGeneralPage(
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

  const row = new Adw.ActionRow({
    title: 'Show Main Panel',
    subtitle: 'Keyboard shortcut to invoke main panel for focused window',
  });

  const shortcutButton = new Gtk.Button({
    valign: Gtk.Align.CENTER,
    has_frame: true,
  });

  const updateShortcutLabel = () => {
    const shortcuts = settings.get_strv(SETTINGS_KEY_SHORTCUT);
    shortcutButton.set_label(shortcuts.length > 0 ? shortcuts[0] : 'Disabled');
  };

  updateShortcutLabel();

  shortcutButton.connect('clicked', () => {
    showShortcutDialog(window, settings, updateShortcutLabel);
  });

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

  return page;
}

// Opacity values for space visibility
const ENABLED_OPACITY = 1.0;
const DISABLED_OPACITY = 0.35;

/**
 * Create the Spaces preferences page with pre-loaded data
 */
function createSpacesPageWithData(
  rows: SpacesRow[],
  monitors: Map<string, Monitor>
): Adw.PreferencesPage {
  const page = new Adw.PreferencesPage({
    title: 'Spaces',
    icon_name: 'view-grid-symbolic',
  });

  const group = new Adw.PreferencesGroup({
    title: 'Space Visibility',
    description:
      'Click a Space to toggle visibility. Disabled Spaces are hidden from the main panel.',
  });

  // Add each row as a horizontal container (matching main panel layout)
  let hasSpaces = false;
  for (const row of rows) {
    if (row.spaces.length === 0) continue;
    hasSpaces = true;

    const rowWidget = createSpacesRowWidget(row, monitors);
    group.add(rowWidget);
  }

  if (!hasSpaces) {
    const emptyRow = new Adw.ActionRow({
      title: 'No Spaces configured',
      subtitle: 'Import a layout configuration to add Spaces',
    });
    group.add(emptyRow);
  }

  page.add(group);

  return page;
}

/**
 * Create a horizontal row container for multiple spaces
 */
function createSpacesRowWidget(row: SpacesRow, monitors: Map<string, Monitor>): Gtk.Widget {
  // Create horizontal container for spaces in this row
  const rowBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: SPACE_SPACING,
    halign: Gtk.Align.CENTER,
    margin_top: 8,
    margin_bottom: 8,
  });

  // Add each space in this row
  for (const space of row.spaces) {
    const spaceWidget = createClickableSpace(space, monitors);
    rowBox.append(spaceWidget);
  }

  return rowBox;
}

/**
 * Get extension data directory path
 */
function getExtensionDataPath(filename: string): string {
  const dataDir = GLib.get_user_data_dir();
  return GLib.build_filenamev([
    dataDir,
    'gnome-shell',
    'extensions',
    'snappa@x7c1.github.io',
    filename,
  ]);
}

/**
 * Load monitor configuration from file saved by extension
 * Falls back to default horizontal layout if file doesn't exist
 */
function loadMonitors(rows: SpacesRow[]): Map<string, Monitor> {
  const monitors = new Map<string, Monitor>();
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (file.query_exists(null)) {
    try {
      const [success, contents] = file.load_contents(null);
      if (success) {
        const contentsString = new TextDecoder('utf-8').decode(contents);
        const monitorsArray = JSON.parse(contentsString) as Monitor[];
        for (const monitor of monitorsArray) {
          monitors.set(String(monitor.index), monitor);
        }
        return monitors;
      }
    } catch (e) {
      // Fall through to default
    }
  }

  // Fallback: create default horizontal layout
  const monitorKeys = new Set<string>();
  for (const row of rows) {
    for (const space of row.spaces) {
      for (const key of Object.keys(space.displays)) {
        monitorKeys.add(key);
      }
    }
  }

  const sortedKeys = Array.from(monitorKeys).sort();
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    monitors.set(key, {
      index: parseInt(key, 10),
      geometry: {
        x: i * defaultWidth,
        y: 0,
        width: defaultWidth,
        height: defaultHeight,
      },
      workArea: {
        x: i * defaultWidth,
        y: 0,
        width: defaultWidth,
        height: defaultHeight,
      },
      isPrimary: i === 0,
    });
  }

  return monitors;
}

/**
 * Create a clickable space widget with opacity-based enabled/disabled feedback
 */
function createClickableSpace(space: Space, monitors: Map<string, Monitor>): Gtk.Widget {
  // Track current enabled state
  let enabled = space.enabled !== false;

  // Create miniature space visualization
  const miniatureWidget = createGtkMiniatureSpace({
    space,
    monitors,
  });

  // Set initial opacity based on enabled state
  miniatureWidget.set_opacity(enabled ? ENABLED_OPACITY : DISABLED_OPACITY);

  // Create button wrapper with flat style (no button appearance)
  const button = new Gtk.Button({
    child: miniatureWidget,
    has_frame: false,
  });

  // Apply CSS to remove button styling
  const cssProvider = new Gtk.CssProvider();
  cssProvider.load_from_string(`
    button {
      padding: 0;
      min-width: 0;
      min-height: 0;
      background: transparent;
    }
    button:hover {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 6px;
    }
    button:active {
      background: rgba(255, 255, 255, 0.1);
    }
  `);
  button.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

  // Handle click to toggle enabled state
  button.connect('clicked', () => {
    enabled = !enabled;
    setSpaceEnabled(space.id, enabled);
    miniatureWidget.set_opacity(enabled ? ENABLED_OPACITY : DISABLED_OPACITY);
  });

  return button;
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

      if (keyval === Gdk.KEY_Escape) {
        dialog.close();
        return true;
      }

      if (keyval === Gdk.KEY_BackSpace) {
        settings.set_strv(SETTINGS_KEY_SHORTCUT, []);
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
