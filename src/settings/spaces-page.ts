import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { setSpaceEnabled } from '../app/repository/spaces.js';
import type { Monitor, Space, SpacesRow } from '../app/types/index.js';
import { calculateSpaceDimensions, createGtkMiniatureSpace } from './gtk-miniature-space.js';

// Spacing between spaces in a row
const SPACE_SPACING = 4;

// Opacity values for space visibility
const ENABLED_OPACITY = 1.0;
const DISABLED_OPACITY = 0.35;

// Opacity change amount when hovering
const HOVER_OPACITY_CHANGE = 0.15;

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
    // Add spacing between spaces
    rowWidth += (row.spaces.length - 1) * SPACE_SPACING;

    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  return maxRowWidth;
}

/**
 * Create the Spaces preferences page with pre-loaded data
 */
export function createSpacesPage(
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

  // Create a container to hold all rows (centered as a block, rows left-aligned within)
  const rowsContainer = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    halign: Gtk.Align.CENTER,
  });

  // Add each row as a horizontal container (matching main panel layout)
  let hasSpaces = false;
  for (const row of rows) {
    if (row.spaces.length === 0) continue;
    hasSpaces = true;

    const rowWidget = createSpacesRowWidget(row, monitors);
    rowsContainer.append(rowWidget);
  }

  if (hasSpaces) {
    group.add(rowsContainer);
  } else {
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
    halign: Gtk.Align.START,
    margin_top: 2,
    margin_bottom: 2,
  });

  // Add each space in this row
  for (const space of row.spaces) {
    const spaceWidget = createClickableSpace(space, monitors);
    rowBox.append(spaceWidget);
  }

  return rowBox;
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

  // Helper to get current base opacity
  const getBaseOpacity = () => (enabled ? ENABLED_OPACITY : DISABLED_OPACITY);

  // Helper to get hover opacity (enabled: lighter, disabled: darker)
  const getHoverOpacity = () =>
    enabled ? ENABLED_OPACITY - HOVER_OPACITY_CHANGE : DISABLED_OPACITY + HOVER_OPACITY_CHANGE;

  // Set initial opacity based on enabled state
  miniatureWidget.set_opacity(getBaseOpacity());

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
  `);
  button.get_style_context().add_provider(cssProvider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

  // Set pointer cursor on hover
  button.set_cursor_from_name('pointer');

  // Add hover effect using EventControllerMotion
  const motionController = new Gtk.EventControllerMotion();
  motionController.connect('enter', () => {
    miniatureWidget.set_opacity(getHoverOpacity());
  });
  motionController.connect('leave', () => {
    miniatureWidget.set_opacity(getBaseOpacity());
  });
  button.add_controller(motionController);

  // Handle click to toggle enabled state
  button.connect('clicked', () => {
    enabled = !enabled;
    setSpaceEnabled(space.id, enabled);
    miniatureWidget.set_opacity(getBaseOpacity());
  });

  return button;
}
