// Extension
export const EXTENSION_UUID = 'snappa@x7c1.github.io';

// Data files (snappa-generated, distinct from GNOME Shell required files like metadata.json)
export const HISTORY_FILE_NAME = 'history.snappa.json';
export const MONITORS_FILE_NAME = 'monitors.snappa.json';
// SpaceCollection files
export const PRESET_SPACE_COLLECTIONS_FILE_NAME = 'preset-space-collections.snappa.json';
export const CUSTOM_SPACE_COLLECTIONS_FILE_NAME = 'custom-space-collections.snappa.json';

// Timing
export const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding panel when cursor leaves

// Dimensions
export const PANEL_PADDING = 12; // Padding around panel content
export const PANEL_EDGE_PADDING = 10; // Minimum distance from screen edges
export const DISPLAY_SPACING = 4; // Spacing between miniature displays (vertical within rows, or old vertical spacing)
export const ROW_SPACING = 10; // Vertical spacing between space rows
export const DISPLAY_SPACING_HORIZONTAL = 12; // Horizontal spacing between displays within a row
export const BUTTON_BORDER_WIDTH = 1; // Border width for layout buttons
export const FOOTER_MARGIN_TOP = 3; // Margin above footer

// Colors
export const PANEL_BG_COLOR = 'rgba(40, 40, 40, 0.9)'; // Main panel background
export const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)'; // Main panel border
export const MINIATURE_SPACE_BG_COLOR = 'rgba(80, 80, 80, 0.9)'; // Miniature space background
export const DISPLAY_BG_COLOR = 'rgba(20, 20, 20, 0.9)';
export const BUTTON_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
export const BUTTON_BG_COLOR_HOVER = 'rgba(120, 120, 120, 0.8)';
export const BUTTON_BG_COLOR_SELECTED = 'rgba(100, 150, 250, 0.7)'; // Blue highlight for previously selected layouts
export const BUTTON_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
export const BUTTON_BORDER_COLOR_HOVER = 'rgba(255, 255, 255, 0.6)';
export const FOOTER_TEXT_COLOR = 'rgba(255, 255, 255, 0.5)';

// Multi-monitor panel constants
export const MAX_MONITOR_DISPLAY_WIDTH = 240; // Maximum width for the widest monitor in miniature display
export const SPACE_SPACING = 6; // Vertical spacing between Space sections
export const MONITOR_MARGIN = 6; // Margin around each monitor display in miniature space
