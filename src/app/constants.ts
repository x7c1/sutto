import type { LayoutConfiguration } from './types/layout-setting';

// Timing
export const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding panel when cursor leaves

// Dimensions
export const MINIATURE_DISPLAY_WIDTH = 204; // Fixed width for miniature displays
export const PANEL_PADDING = 12; // Padding around panel content
export const PANEL_EDGE_PADDING = 10; // Minimum distance from screen edges
export const DISPLAY_SPACING = 4; // Spacing between miniature displays (vertical within categories, or old vertical spacing)
export const CATEGORY_SPACING = 10; // Vertical spacing between categories
export const DISPLAY_SPACING_HORIZONTAL = 12; // Horizontal spacing between displays within a category
export const MAX_DISPLAYS_PER_ROW = 3; // Maximum number of displays per row in a category
export const BUTTON_BORDER_WIDTH = 1; // Border width for layout buttons
export const FOOTER_MARGIN_TOP = 2; // Margin above footer

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
export const MAX_PANEL_WIDTH = 800; // Maximum width for multi-monitor panel layout
export const MAX_PANEL_HEIGHT = 600; // Maximum height for multi-monitor panel layout
export const DISPLAY_GROUP_SPACING = 6; // Vertical spacing between Display Group sections
export const MONITOR_MARGIN = 8; // Margin around each monitor display in miniature space

// Default layout configuration (multi-monitor structure)
// Includes a basic dual-monitor configuration
export const DEFAULT_LAYOUT_CONFIGURATION: LayoutConfiguration = {
  layoutGroups: [
    {
      name: 'vertical 2-split',
      layouts: [
        { label: 'Left Half', x: '0', y: '0', width: '50%', height: '100%' },
        { label: 'Right Half', x: '50%', y: '0', width: '50%', height: '100%' },
      ],
    },
    {
      name: 'vertical 3-split',
      layouts: [
        { label: 'Left Third', x: '0', y: '0', width: '1/3', height: '100%' },
        { label: 'Center Third', x: '1/3', y: '0', width: '1/3', height: '100%' },
        { label: 'Right Third', x: '2/3', y: '0', width: '1/3', height: '100%' },
      ],
    },
    {
      name: 'grid 2x2',
      layouts: [
        { label: 'Top Left', x: '0', y: '0', width: '50%', height: '50%' },
        { label: 'Top Right', x: '50%', y: '0', width: '50%', height: '50%' },
        { label: 'Bottom Left', x: '0', y: '50%', width: '50%', height: '50%' },
        { label: 'Bottom Right', x: '50%', y: '50%', width: '50%', height: '50%' },
      ],
    },
  ],
  layoutCategories: [
    {
      name: 'Vertical Division Patterns',
      displayGroups: [
        {
          displays: {
            '0': 'vertical 3-split',
            '1': 'vertical 3-split',
          },
        },
        {
          displays: {
            '0': 'vertical 2-split',
            '1': 'vertical 3-split',
          },
        },
      ],
    },
    {
      name: 'Grid Patterns',
      displayGroups: [
        {
          displays: {
            '0': 'grid 2x2',
            '1': 'grid 2x2',
          },
        },
      ],
    },
  ],
};
