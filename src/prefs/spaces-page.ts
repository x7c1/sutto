import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {
  deleteCustomCollection,
  ensurePresetForCurrentMonitors,
  findCollectionById,
  importLayoutConfigurationFromJson,
  loadAllCollections,
  loadCustomCollections,
  loadPresetCollections,
  updateSpaceEnabled,
} from '../app/facade/index.js';
import type {
  Monitor,
  MonitorEnvironmentStorage,
  Space,
  SpaceCollection,
  SpacesRow,
} from '../app/types/index.js';
import { calculateSpaceDimensions, createGtkMiniatureSpace } from './gtk-miniature-space.js';
import {
  createDefaultMonitors,
  environmentToMonitorMap,
  findEnvironmentForDisplayCount,
  loadMonitorStorage,
} from './monitors.js';

// Spacing between spaces in a row
const SPACE_SPACING = 4;

/**
 * Get the display count for a collection (max monitor count across all spaces)
 */
function getCollectionDisplayCount(collection: SpaceCollection): number {
  let maxDisplays = 0;
  for (const row of collection.rows) {
    for (const space of row.spaces) {
      const displayCount = Object.keys(space.displays).length;
      maxDisplays = Math.max(maxDisplays, displayCount);
    }
  }
  return maxDisplays;
}

/**
 * Get the display count for a space
 */
function getSpaceDisplayCount(space: Space): number {
  return Object.keys(space.displays).length;
}

/**
 * Get the appropriate monitors for rendering a collection
 * Uses environment matching to find monitors with the right count
 */
function getMonitorsForCollection(
  collection: SpaceCollection,
  storage: MonitorEnvironmentStorage | null,
  fallbackMonitors: Map<string, Monitor>
): Map<string, Monitor> {
  const displayCount = getCollectionDisplayCount(collection);
  return getMonitorsForDisplayCount(displayCount, storage, fallbackMonitors);
}

/**
 * Get the appropriate monitors for rendering a space
 * Uses environment matching to find monitors with the right count
 */
function getMonitorsForSpace(
  space: Space,
  storage: MonitorEnvironmentStorage | null,
  fallbackMonitors: Map<string, Monitor>
): Map<string, Monitor> {
  const displayCount = getSpaceDisplayCount(space);
  return getMonitorsForDisplayCount(displayCount, storage, fallbackMonitors);
}

/**
 * Get monitors for a given display count
 */
function getMonitorsForDisplayCount(
  displayCount: number,
  storage: MonitorEnvironmentStorage | null,
  fallbackMonitors: Map<string, Monitor>
): Map<string, Monitor> {
  // Try to find matching environment
  const environment = findEnvironmentForDisplayCount(storage, displayCount);
  if (environment) {
    return environmentToMonitorMap(environment);
  }

  // Check if fallback monitors have the right count
  if (fallbackMonitors.size === displayCount) {
    return fallbackMonitors;
  }

  // Create default monitors using current monitor's dimensions as reference
  const referenceMonitor = fallbackMonitors.values().next().value as Monitor | undefined;
  return createDefaultMonitors(displayCount, referenceMonitor);
}

// Opacity values for space visibility
const ENABLED_OPACITY = 1.0;
const DISABLED_OPACITY = 0.35;

// Opacity change amount when hovering
const HOVER_OPACITY_CHANGE = 0.15;

// List pane width
const LIST_PANE_WIDTH = 200;

// Window padding (must match preferences.ts)
const WINDOW_HORIZONTAL_PADDING = 80;
const WINDOW_VERTICAL_PADDING = 100;

/**
 * Calculate the preview content width for a set of rows (without list pane)
 */
function calculatePreviewWidth(rows: SpacesRow[], monitors: Map<string, Monitor>): number {
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

  return maxRowWidth;
}

/**
 * Calculate the required width to display all space rows
 */
export function calculateRequiredWidth(rows: SpacesRow[], monitors: Map<string, Monitor>): number {
  return calculatePreviewWidth(rows, monitors) + LIST_PANE_WIDTH + 50; // Add list pane width and some padding
}

/**
 * Calculate required window dimensions for a single collection
 * Uses appropriate monitors for the collection's display count
 */
export function calculateWindowDimensionsForCollection(
  collection: SpaceCollection,
  fallbackMonitors: Map<string, Monitor>
): { width: number; height: number } {
  const monitorStorage = loadMonitorStorage();
  const collectionMonitors = getMonitorsForCollection(collection, monitorStorage, fallbackMonitors);
  const width = calculateRequiredWidth(collection.rows, collectionMonitors);
  const height = calculateRequiredHeight(collection.rows, collectionMonitors);
  return { width, height };
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

  // Add padding for UI chrome:
  // - Adw.PreferencesPage title bar: ~50
  // - Adw.PreferencesGroup header + description: ~100
  return totalHeight + 150;
}

interface SpacesPageState {
  activeCollectionId: string;
  selectedCollectionId: string;
  previewContainer: Gtk.Box;
  previewScrolled: Gtk.ScrolledWindow | null; // Reference for updating preview width
  currentMaxPreviewWidth: number; // Track current max width to expand if needed
  currentMaxPreviewHeight: number; // Track current max height to expand if needed
  monitors: Map<string, Monitor>; // Current environment monitors (for window sizing)
  monitorStorage: MonitorEnvironmentStorage | null; // Multi-environment storage
  checkButtons: Map<string, Gtk.CheckButton>;
  selectionIndicators: Map<string, Gtk.Image>;
  firstRadioButton: Gtk.CheckButton | null;
  onActiveChanged: (collectionId: string) => void;
  listInnerBox: Gtk.Box | null; // Reference to the inner box for adding new collections
  customSectionBox: Gtk.Box | null; // Container for custom collection rows
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

  // Load monitor storage for multi-environment support
  const monitorStorage = loadMonitorStorage();

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
    margin_top: 12,
  });

  // Wrap preview in scrolled window to handle many rows
  const previewScrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    hexpand: true,
    vexpand: true,
  });
  previewScrolled.set_child(previewContainer);

  // Determine initial active collection before creating UI
  const allCollections = loadAllCollections();
  const initialCollection =
    allCollections.find((c) => c.id === activeCollectionId) || allCollections[0];
  const resolvedActiveId = initialCollection?.id ?? '';

  // Calculate preview dimensions based on the ACTIVE collection (not max of all)
  // Dimensions will expand when selecting larger collections via expandSizeIfNeeded
  let initialPreviewWidth = 0;
  let initialPreviewHeight = 0;
  if (initialCollection) {
    const collectionMonitors = getMonitorsForCollection(
      initialCollection,
      monitorStorage,
      monitors
    );
    initialPreviewWidth = calculatePreviewWidth(initialCollection.rows, collectionMonitors);
    initialPreviewHeight = calculateRequiredHeight(initialCollection.rows, collectionMonitors);
  }
  // Set initial width on preview scrolled window
  if (initialPreviewWidth > 0) {
    previewScrolled.set_size_request(initialPreviewWidth + 20, -1); // Add padding
  }

  // Create state object for managing selections
  const state: SpacesPageState = {
    activeCollectionId: resolvedActiveId,
    selectedCollectionId: resolvedActiveId,
    previewContainer,
    previewScrolled,
    currentMaxPreviewWidth: initialPreviewWidth,
    currentMaxPreviewHeight: initialPreviewHeight,
    monitors,
    monitorStorage,
    checkButtons: new Map(),
    selectionIndicators: new Map(),
    firstRadioButton: null,
    onActiveChanged,
    listInnerBox: null,
    customSectionBox: null,
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
  if (initialCollection) {
    updatePreview(state, initialCollection);
    // Notify settings of resolved active ID if it changed
    if (resolvedActiveId !== activeCollectionId) {
      onActiveChanged(resolvedActiveId);
    }
  }

  group.add(mainBox);
  page.add(group);

  return page;
}

/**
 * Render the custom section contents (collection rows or empty label)
 */
function renderCustomSection(state: SpacesPageState): void {
  const box = state.customSectionBox;
  if (!box) return;

  // Clear existing children
  let child = box.get_first_child();
  while (child) {
    const next = child.get_next_sibling();
    box.remove(child);
    child = next;
  }

  // Render custom collections or empty label
  const customs = loadCustomCollections();
  if (customs.length === 0) {
    const emptyLabel = new Gtk.Label({
      label: 'No custom collections',
      css_classes: ['dim-label'],
      xalign: 0,
    });
    box.append(emptyLabel);
  } else {
    for (const collection of customs) {
      const row = createCollectionRow(state, collection, true, null);
      box.append(row);
    }
  }
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

  // Store reference for later use (e.g., adding imported collections)
  state.listInnerBox = innerBox;

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

  const customSectionBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 4,
  });
  state.customSectionBox = customSectionBox;
  innerBox.append(customSectionBox);

  renderCustomSection(state);

  scrolled.set_child(innerBox);
  listBox.append(scrolled);

  // Import button
  const importButton = new Gtk.Button({
    label: 'Import...',
    margin_top: 8,
  });
  importButton.connect('clicked', () => {
    showImportDialog(state);
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

  // Always show radio button for collection selection
  const radio = new Gtk.CheckButton();
  if (state.firstRadioButton) {
    radio.set_group(state.firstRadioButton);
  } else {
    state.firstRadioButton = radio;
  }
  if (collection.id === state.activeCollectionId) {
    radio.set_active(true);
  }
  state.checkButtons.set(collection.id, radio);

  radio.connect('toggled', () => {
    // Only act when this radio becomes active (ignore deactivation events)
    if (radio.get_active()) {
      state.activeCollectionId = collection.id;
      state.selectedCollectionId = collection.id;
      state.onActiveChanged(collection.id);
      updateSelectionIndicators(state);
      // Reload collection from file to get latest enabled states
      const freshCollection = findCollectionById(collection.id);
      if (freshCollection) {
        updatePreview(state, freshCollection);
      }
    }
  });

  rowBox.append(radio);

  // Collection name label (clickable)
  const nameLabel = new Gtk.Label({
    label: collection.name,
    xalign: 0,
  });
  const clickGesture = new Gtk.GestureClick();
  clickGesture.connect('released', () => {
    // When there's a radio button, activate it (which triggers the selection logic)
    // Otherwise, just select this collection directly
    const existingRadio = state.checkButtons.get(collection.id);
    if (existingRadio) {
      existingRadio.set_active(true);
    } else {
      state.activeCollectionId = collection.id;
      state.selectedCollectionId = collection.id;
      state.onActiveChanged(collection.id);
      updateSelectionIndicators(state);
      // Reload collection from file to get latest enabled states
      const freshCollection = findCollectionById(collection.id);
      if (freshCollection) {
        updatePreview(state, freshCollection);
      }
    }
  });
  nameLabel.add_controller(clickGesture);

  // Hover style for clickable label
  nameLabel.set_cursor_from_name('pointer');
  const motionController = new Gtk.EventControllerMotion();
  motionController.connect('enter', () => {
    nameLabel.set_opacity(0.7);
  });
  motionController.connect('leave', () => {
    nameLabel.set_opacity(1.0);
  });
  nameLabel.add_controller(motionController);

  rowBox.append(nameLabel);

  // Spacer to push delete button and indicator to the right
  const spacer = new Gtk.Box({ hexpand: true });
  rowBox.append(spacer);

  // Selection indicator (">") shown for the active collection
  // Use opacity instead of visibility to reserve space and prevent layout shifts
  const indicator = new Gtk.Image({
    icon_name: 'go-next-symbolic',
    opacity: collection.id === state.activeCollectionId ? 1 : 0,
  });
  state.selectionIndicators.set(collection.id, indicator);
  rowBox.append(indicator);

  // Right-click context menu for custom collections
  if (isCustom) {
    const menu = new Gio.Menu();
    menu.append('Delete', 'collection.delete');

    const popover = new Gtk.PopoverMenu({
      menu_model: menu,
      has_arrow: false,
    });
    popover.set_parent(rowBox);

    const actionGroup = new Gio.SimpleActionGroup();
    const deleteAction = new Gio.SimpleAction({ name: 'delete' });
    deleteAction.connect('activate', () => {
      const deleted = deleteCustomCollection(collection.id);
      if (deleted) {
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
        // Re-render the custom section
        renderCustomSection(state);
      }
    });
    actionGroup.add_action(deleteAction);
    rowBox.insert_action_group('collection', actionGroup);

    const rightClickGesture = new Gtk.GestureClick({ button: 3 });
    rightClickGesture.connect(
      'released',
      (_gesture: Gtk.GestureClick, _n: number, x: number, y: number) => {
        popover.set_pointing_to(
          new Gdk.Rectangle({ x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 })
        );
        popover.popup();
      }
    );
    rowBox.add_controller(rightClickGesture);
  }

  return rowBox;
}

/**
 * Update selection indicators to show which collection is active
 */
function updateSelectionIndicators(state: SpacesPageState): void {
  for (const [collectionId, indicator] of state.selectionIndicators) {
    indicator.set_opacity(collectionId === state.activeCollectionId ? 1 : 0);
  }
}

/**
 * Expand preview and window size if the collection requires more space
 */
function expandSizeIfNeeded(state: SpacesPageState, collection: SpaceCollection): void {
  const collectionMonitors = getMonitorsForCollection(
    collection,
    state.monitorStorage,
    state.monitors
  );
  const newWidth = calculatePreviewWidth(collection.rows, collectionMonitors);
  const newHeight = calculateRequiredHeight(collection.rows, collectionMonitors);

  const widthExpanded = newWidth > state.currentMaxPreviewWidth;
  const heightExpanded = newHeight > state.currentMaxPreviewHeight;

  if (widthExpanded) {
    state.currentMaxPreviewWidth = newWidth;
    // Expand preview pane width
    if (state.previewScrolled) {
      state.previewScrolled.set_size_request(newWidth + 20, -1);
    }
  }

  if (heightExpanded) {
    state.currentMaxPreviewHeight = newHeight;
  }

  // Expand window if needed
  if (widthExpanded || heightExpanded) {
    const window = state.previewContainer.get_root() as Gtk.Window | null;
    if (window) {
      const currentWidth = window.get_width();
      const currentHeight = window.get_height();

      const requiredWindowWidth =
        state.currentMaxPreviewWidth + LIST_PANE_WIDTH + WINDOW_HORIZONTAL_PADDING + 50;
      const requiredWindowHeight = state.currentMaxPreviewHeight + WINDOW_VERTICAL_PADDING;

      const newWindowWidth = Math.max(currentWidth, requiredWindowWidth);
      const newWindowHeight = Math.max(currentHeight, requiredWindowHeight);

      if (newWindowWidth > currentWidth || newWindowHeight > currentHeight) {
        window.set_default_size(newWindowWidth, newWindowHeight);
      }
    }
  }
}

/**
 * Update the preview pane with the selected collection
 */
function updatePreview(state: SpacesPageState, collection: SpaceCollection): void {
  // Expand preview and window width if needed
  expandSizeIfNeeded(state, collection);

  // Clear existing preview
  let child = state.previewContainer.get_first_child();
  while (child) {
    const next = child.get_next_sibling();
    state.previewContainer.remove(child);
    child = next;
  }

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

  // Get the appropriate monitors for this space's display count
  const spaceMonitors = getMonitorsForSpace(space, state.monitorStorage, state.monitors);

  const miniatureWidget = createGtkMiniatureSpace({
    space,
    monitors: spaceMonitors,
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
function showImportDialog(state: SpacesPageState): void {
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
  const toplevel = state.previewContainer.get_root();
  const window = toplevel instanceof Gtk.Window ? toplevel : null;

  // @ts-expect-error - GTK4 FileDialog.open_multiple accepts callback as third argument
  dialog.open_multiple(window, null, (_source: unknown, result: Gio.AsyncResult) => {
    try {
      const files = dialog.open_multiple_finish(result);
      if (files) {
        const count = files.get_n_items();
        for (let i = 0; i < count; i++) {
          const file = files.get_item(i) as Gio.File | null;
          if (file) {
            importFile(state, file);
          }
        }
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
function importFile(state: SpacesPageState, file: Gio.File): void {
  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      console.log('Failed to load file contents');
      return;
    }

    const jsonString = new TextDecoder('utf-8').decode(contents);
    const collection = importLayoutConfigurationFromJson(jsonString);

    if (collection) {
      console.log(`Successfully imported: ${collection.name}`);
      renderCustomSection(state);
    }
  } catch (e) {
    console.log(`Error importing file: ${e}`);
  }
}
