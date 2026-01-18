import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {
  loadAllCollections,
  loadCustomCollections,
  loadPresetCollections,
  updateSpaceEnabled,
} from '../app/repository/space-collection.js';
import {
  deleteCustomCollection,
  importLayoutConfigurationFromJson,
} from '../app/service/custom-import.js';
import { ensurePresetForCurrentMonitors } from '../app/service/preset-generator.js';
import type { Monitor, Space, SpaceCollection, SpacesRow } from '../app/types/index.js';
import { calculateSpaceDimensions, createGtkMiniatureSpace } from './gtk-miniature-space.js';

// Spacing between spaces in a row
const SPACE_SPACING = 4;

// Opacity values for space visibility
const ENABLED_OPACITY = 1.0;
const DISABLED_OPACITY = 0.35;

// Opacity change amount when hovering
const HOVER_OPACITY_CHANGE = 0.15;

// List pane width
const LIST_PANE_WIDTH = 200;

/**
 * Calculate the required width to display all space rows
 */
export function calculateRequiredWidth(rows: SpacesRow[], monitors: Map<string, Monitor>): number {
  let maxRowWidth = 0;

  for (const row of rows) {
    if (row.spaces.length === 0) continue;

    let rowWidth = 0;
    for (const space of row.spaces) {
      const dimensions = calculateSpaceDimensions(space, monitors);
      rowWidth += dimensions.width;
    }
    rowWidth += (row.spaces.length - 1) * SPACE_SPACING;

    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  return maxRowWidth + LIST_PANE_WIDTH + 50; // Add list pane width and some padding
}

/**
 * Calculate the required height to display all space rows
 */
export function calculateRequiredHeight(rows: SpacesRow[], monitors: Map<string, Monitor>): number {
  let totalHeight = 0;

  for (const row of rows) {
    if (row.spaces.length === 0) continue;

    // Find the tallest space in this row
    let maxRowHeight = 0;
    for (const space of row.spaces) {
      const dimensions = calculateSpaceDimensions(space, monitors);
      maxRowHeight = Math.max(maxRowHeight, dimensions.height);
    }
    totalHeight += maxRowHeight + SPACE_SPACING;
  }

  // Add padding for: title (50), group header (80), collection name label (30), margins (40)
  return totalHeight + 200;
}

interface SpacesPageState {
  activeCollectionId: string;
  selectedCollectionId: string;
  previewContainer: Gtk.Box;
  monitors: Map<string, Monitor>;
  checkButtons: Map<string, Gtk.CheckButton>;
  onActiveChanged: (collectionId: string) => void;
}

/**
 * Create the Spaces preferences page with SpaceCollection selection
 */
export function createSpacesPage(
  monitors: Map<string, Monitor>,
  activeCollectionId: string,
  onActiveChanged: (collectionId: string) => void
): Adw.PreferencesPage {
  // Ensure presets exist for current monitor count
  ensurePresetForCurrentMonitors();

  const page = new Adw.PreferencesPage({
    title: 'Spaces',
    icon_name: 'view-grid-symbolic',
  });

  const group = new Adw.PreferencesGroup({
    title: 'Space Collections',
    description: 'Select a collection to use. Click spaces in the preview to toggle visibility.',
  });

  // Create main container with horizontal layout (list | preview)
  const mainBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 12,
    homogeneous: false,
  });

  // Create preview container (right pane) with scrolling support
  const previewContainer = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    halign: Gtk.Align.CENTER,
    valign: Gtk.Align.START,
  });

  // Wrap preview in scrolled window to handle many rows
  const previewScrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: true,
    vexpand: true,
  });
  previewScrolled.set_child(previewContainer);

  // Create state object for managing selections
  const state: SpacesPageState = {
    activeCollectionId,
    selectedCollectionId: activeCollectionId,
    previewContainer,
    monitors,
    checkButtons: new Map(),
    onActiveChanged,
  };

  // Create list pane (left)
  const listPane = createListPane(state);
  mainBox.append(listPane);

  // Add separator
  const separator = new Gtk.Separator({
    orientation: Gtk.Orientation.VERTICAL,
  });
  mainBox.append(separator);

  // Add scrolled preview container (right)
  mainBox.append(previewScrolled);

  // Load initial preview
  const allCollections = loadAllCollections();
  const initialCollection =
    allCollections.find((c) => c.id === activeCollectionId) || allCollections[0];
  if (initialCollection) {
    state.selectedCollectionId = initialCollection.id;
    updatePreview(state, initialCollection);
  }

  group.add(mainBox);
  page.add(group);

  return page;
}

/**
 * Create the list pane with preset and custom sections
 */
function createListPane(state: SpacesPageState): Gtk.Widget {
  const listBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 8,
    width_request: LIST_PANE_WIDTH,
  });

  // Create scrolled window for the list
  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
  });

  const innerBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 4,
  });

  // Preset section
  const presetLabel = new Gtk.Label({
    label: '<b>Preset</b>',
    use_markup: true,
    xalign: 0,
    margin_bottom: 4,
  });
  innerBox.append(presetLabel);

  const presets = loadPresetCollections();
  const radioGroup: Gtk.CheckButton | null = null;

  for (const collection of presets) {
    const row = createCollectionRow(state, collection, false, radioGroup);
    innerBox.append(row);
  }

  // Custom section
  const customLabel = new Gtk.Label({
    label: '<b>Custom</b>',
    use_markup: true,
    xalign: 0,
    margin_top: 12,
    margin_bottom: 4,
  });
  innerBox.append(customLabel);

  const customs = loadCustomCollections();
  for (const collection of customs) {
    const row = createCollectionRow(state, collection, true, radioGroup);
    innerBox.append(row);
  }

  if (customs.length === 0) {
    const emptyLabel = new Gtk.Label({
      label: 'No custom collections',
      css_classes: ['dim-label'],
      xalign: 0,
    });
    innerBox.append(emptyLabel);
  }

  scrolled.set_child(innerBox);
  listBox.append(scrolled);

  // Import button
  const importButton = new Gtk.Button({
    label: 'Import...',
    margin_top: 8,
  });
  importButton.connect('clicked', () => {
    showImportDialog(state, listBox);
  });
  listBox.append(importButton);

  return listBox;
}

/**
 * Create a row for a collection in the list
 */
function createCollectionRow(
  state: SpacesPageState,
  collection: SpaceCollection,
  isCustom: boolean,
  _radioGroup: Gtk.CheckButton | null
): Gtk.Widget {
  const rowBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 8,
  });

  // Radio button for selection (first button has no group, subsequent buttons join the group)
  const existingButton = state.checkButtons.values().next().value as Gtk.CheckButton | undefined;
  const radio = new Gtk.CheckButton();
  if (existingButton) {
    radio.set_group(existingButton);
  }
  if (collection.id === state.activeCollectionId) {
    radio.set_active(true);
  }
  state.checkButtons.set(collection.id, radio);

  radio.connect('toggled', () => {
    if (radio.get_active()) {
      state.activeCollectionId = collection.id;
      state.selectedCollectionId = collection.id;
      state.onActiveChanged(collection.id);
      updatePreview(state, collection);
    } else {
      // Prevent unchecking - radio buttons must always have one selected
      if (state.activeCollectionId === collection.id) {
        radio.set_active(true);
      }
    }
  });

  rowBox.append(radio);

  // Collection name label (clickable)
  const nameButton = new Gtk.Button({
    label: collection.name,
    has_frame: false,
    hexpand: true,
    halign: Gtk.Align.START,
  });
  nameButton.connect('clicked', () => {
    radio.set_active(true);
  });
  rowBox.append(nameButton);

  // Delete button for custom collections
  if (isCustom) {
    const deleteButton = new Gtk.Button({
      icon_name: 'edit-delete-symbolic',
      has_frame: false,
      css_classes: ['flat'],
    });
    deleteButton.connect('clicked', () => {
      const deleted = deleteCustomCollection(collection.id);
      if (deleted) {
        // Remove from UI
        const parent = rowBox.get_parent() as Gtk.Box | null;
        if (parent) {
          parent.remove(rowBox);
        }
        // If this was the active collection, select first preset
        if (state.activeCollectionId === collection.id) {
          const presets = loadPresetCollections();
          if (presets.length > 0) {
            state.activeCollectionId = presets[0].id;
            state.onActiveChanged(presets[0].id);
            const firstRadio = state.checkButtons.get(presets[0].id);
            if (firstRadio) {
              firstRadio.set_active(true);
            }
          }
        }
      }
    });
    rowBox.append(deleteButton);
  }

  return rowBox;
}

/**
 * Update the preview pane with the selected collection
 */
function updatePreview(state: SpacesPageState, collection: SpaceCollection): void {
  // Clear existing preview
  let child = state.previewContainer.get_first_child();
  while (child) {
    const next = child.get_next_sibling();
    state.previewContainer.remove(child);
    child = next;
  }

  // Add collection name
  const titleLabel = new Gtk.Label({
    label: `<b>${GLib.markup_escape_text(collection.name, -1)}</b>`,
    use_markup: true,
    margin_bottom: 12,
  });
  state.previewContainer.append(titleLabel);

  // Add rows
  if (collection.rows.length === 0) {
    const emptyLabel = new Gtk.Label({
      label: 'No spaces in this collection',
      css_classes: ['dim-label'],
    });
    state.previewContainer.append(emptyLabel);
    return;
  }

  for (const row of collection.rows) {
    if (row.spaces.length === 0) continue;

    const rowWidget = createSpacesRowWidget(state, collection.id, row);
    state.previewContainer.append(rowWidget);
  }
}

/**
 * Create a horizontal row container for multiple spaces
 */
function createSpacesRowWidget(
  state: SpacesPageState,
  collectionId: string,
  row: SpacesRow
): Gtk.Widget {
  const rowBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: SPACE_SPACING,
    halign: Gtk.Align.START,
    margin_top: 2,
    margin_bottom: 2,
  });

  for (const space of row.spaces) {
    const spaceWidget = createClickableSpace(state, collectionId, space);
    rowBox.append(spaceWidget);
  }

  return rowBox;
}

/**
 * Create a clickable space widget with opacity-based enabled/disabled feedback
 */
function createClickableSpace(
  state: SpacesPageState,
  collectionId: string,
  space: Space
): Gtk.Widget {
  let enabled = space.enabled !== false;

  const miniatureWidget = createGtkMiniatureSpace({
    space,
    monitors: state.monitors,
  });

  const getBaseOpacity = () => (enabled ? ENABLED_OPACITY : DISABLED_OPACITY);
  const getHoverOpacity = () =>
    enabled ? ENABLED_OPACITY - HOVER_OPACITY_CHANGE : DISABLED_OPACITY + HOVER_OPACITY_CHANGE;

  miniatureWidget.set_opacity(getBaseOpacity());

  const button = new Gtk.Button({
    child: miniatureWidget,
    has_frame: false,
  });

  const cssProvider = new Gtk.CssProvider();
  cssProvider.load_from_string(`
    button {
      padding: 0;
      min-width: 0;
      min-height: 0;
      background: transparent;
    }
  `);
  button.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

  button.set_cursor_from_name('pointer');

  const motionController = new Gtk.EventControllerMotion();
  motionController.connect('enter', () => {
    miniatureWidget.set_opacity(getHoverOpacity());
  });
  motionController.connect('leave', () => {
    miniatureWidget.set_opacity(getBaseOpacity());
  });
  button.add_controller(motionController);

  button.connect('clicked', () => {
    enabled = !enabled;
    updateSpaceEnabled(collectionId, space.id, enabled);
    miniatureWidget.set_opacity(getBaseOpacity());
  });

  return button;
}

/**
 * Show the import dialog
 */
function showImportDialog(state: SpacesPageState, listPane: Gtk.Widget): void {
  const dialog = new Gtk.FileDialog({
    title: 'Import Layout Configuration',
    modal: true,
  });

  // Set up file filter for JSON files
  const filter = new Gtk.FileFilter();
  filter.set_name('JSON files');
  filter.add_mime_type('application/json');
  filter.add_pattern('*.json');

  const filters = new Gio.ListStore({ item_type: Gtk.FileFilter.$gtype });
  filters.append(filter);
  dialog.set_filters(filters);
  dialog.set_default_filter(filter);

  // Get the window from the widget hierarchy
  const toplevel = listPane.get_root();
  const window = toplevel instanceof Gtk.Window ? toplevel : null;

  // Use async/await pattern with promise wrapper
  // @ts-expect-error - GTK4 FileDialog.open accepts callback as third argument
  dialog.open(window, null, (_source: unknown, result: Gio.AsyncResult) => {
    try {
      const file = dialog.open_finish(result);
      if (file) {
        importFile(state, file, listPane);
      }
    } catch (e) {
      // User cancelled or error
      console.log(`Import cancelled or failed: ${e}`);
    }
  });
}

/**
 * Import a file and add it to the custom collections
 */
function importFile(state: SpacesPageState, file: Gio.File, listPane: Gtk.Widget): void {
  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      console.log('Failed to load file contents');
      return;
    }

    const jsonString = new TextDecoder('utf-8').decode(contents);
    const collection = importLayoutConfigurationFromJson(jsonString);

    if (collection) {
      // Refresh the entire page to show the new collection
      // For now, just log success - a full refresh would require recreating the page
      console.log(`Successfully imported: ${collection.name}`);

      // Find the custom section and add the new row
      // This is a simplified approach - ideally we'd refresh the whole list
      const scrolled = listPane.get_first_child() as Gtk.ScrolledWindow | null;
      if (scrolled) {
        const innerBox = scrolled.get_child() as Gtk.Box | null;
        if (innerBox) {
          const row = createCollectionRow(state, collection, true, null);
          // Insert before the import button (which is at the end)
          innerBox.append(row);
        }
      }
    }
  } catch (e) {
    console.log(`Error importing file: ${e}`);
  }
}
