import type { LayoutCategorySetting } from './types/layout-setting';

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
export const FOOTER_MARGIN_TOP = 8; // Margin above footer

// Colors
export const PANEL_BG_COLOR = 'rgba(40, 40, 40, 0.9)'; // Main panel background
export const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)'; // Main panel border
export const DISPLAY_BG_COLOR = 'rgba(20, 20, 20, 0.9)';
export const BUTTON_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
export const BUTTON_BG_COLOR_HOVER = 'rgba(120, 120, 120, 0.8)';
export const BUTTON_BG_COLOR_SELECTED = 'rgba(100, 150, 250, 0.7)'; // Blue highlight for previously selected layouts
export const BUTTON_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
export const BUTTON_BORDER_COLOR_HOVER = 'rgba(255, 255, 255, 0.6)';
export const FOOTER_TEXT_COLOR = 'rgba(255, 255, 255, 0.5)';

// Default layout settings (category-based structure)
// Note: These are settings without IDs - IDs are added when imported to repository
export const DEFAULT_LAYOUT_SETTINGS: LayoutCategorySetting[] = [
  // Category 1: Vertical Division Patterns
  {
    name: 'Vertical Division Patterns',
    layoutGroups: [
      {
        name: 'Vertical 3-split',
        layouts: [
          {
            label: 'Left Third',
            x: '0',
            y: '0',
            width: '1/3',
            height: '100%',
          },
          {
            label: 'Center Third',
            x: '1/3',
            y: '0',
            width: '1/3',
            height: '100%',
          },
          {
            label: 'Right Third',
            x: '2/3',
            y: '0',
            width: '1/3',
            height: '100%',
          },
        ],
      },
      {
        name: 'Vertical 3-split x Horizontal 2-split',
        layouts: [
          {
            label: 'Top-left',
            x: '0',
            y: '0',
            width: '1/3',
            height: '50%',
          },
          {
            label: 'Top-center',
            x: '1/3',
            y: '0',
            width: '1/3',
            height: '50%',
          },
          {
            label: 'Top-right',
            x: '2/3',
            y: '0',
            width: '1/3',
            height: '50%',
          },
          {
            label: 'Bottom-left',
            x: '0',
            y: '50%',
            width: '1/3',
            height: '50%',
          },
          {
            label: 'Bottom-center',
            x: '1/3',
            y: '50%',
            width: '1/3',
            height: '50%',
          },
          {
            label: 'Bottom-right',
            x: '2/3',
            y: '50%',
            width: '1/3',
            height: '50%',
          },
        ],
      },
      {
        name: 'Grid 3x3',
        layouts: [
          {
            label: 'Top-left',
            x: '0',
            y: '0',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Top-center',
            x: '1/3',
            y: '0',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Top-right',
            x: '2/3',
            y: '0',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Middle-left',
            x: '0',
            y: '1/3',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Middle-center',
            x: '1/3',
            y: '1/3',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Middle-right',
            x: '2/3',
            y: '1/3',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Bottom-left',
            x: '0',
            y: '2/3',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Bottom-center',
            x: '1/3',
            y: '2/3',
            width: '1/3',
            height: '1/3',
          },
          {
            label: 'Bottom-right',
            x: '2/3',
            y: '2/3',
            width: '1/3',
            height: '1/3',
          },
        ],
      },
    ],
  },
  // Category 2: Grid Patterns (Progressive Complexity)
  {
    name: 'Grid Patterns',
    layoutGroups: [
      {
        name: 'Vertical 2-split',
        layouts: [
          {
            label: 'Left Half',
            x: '0',
            y: '0',
            width: '50%',
            height: '100%',
          },
          {
            label: 'Right Half',
            x: '50%',
            y: '0',
            width: '50%',
            height: '100%',
          },
        ],
      },
      {
        name: 'Grid 2x2',
        layouts: [
          {
            label: 'Top-left',
            x: '0',
            y: '0',
            width: '50%',
            height: '50%',
          },
          {
            label: 'Top-right',
            x: '50%',
            y: '0',
            width: '50%',
            height: '50%',
          },
          {
            label: 'Bottom-left',
            x: '0',
            y: '50%',
            width: '50%',
            height: '50%',
          },
          {
            label: 'Bottom-right',
            x: '50%',
            y: '50%',
            width: '50%',
            height: '50%',
          },
        ],
      },
      {
        name: 'Grid 4x2',
        layouts: [
          {
            label: 'Top-left',
            x: '0',
            y: '0',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Top-center-left',
            x: '25%',
            y: '0',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Top-center-right',
            x: '50%',
            y: '0',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Top-right',
            x: '75%',
            y: '0',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Bottom-left',
            x: '0',
            y: '50%',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Bottom-center-left',
            x: '25%',
            y: '50%',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Bottom-center-right',
            x: '50%',
            y: '50%',
            width: '25%',
            height: '50%',
          },
          {
            label: 'Bottom-right',
            x: '75%',
            y: '50%',
            width: '25%',
            height: '50%',
          },
        ],
      },
    ],
  },
  // Category 3: Center-Focused Patterns
  {
    name: 'Center-Focused Patterns',
    layoutGroups: [
      {
        name: 'Left 60%',
        layouts: [
          {
            label: 'Left 60%',
            x: '0',
            y: '0',
            width: '60%',
            height: '100%',
          },
          {
            label: 'Right 40%',
            x: '60%',
            y: '0',
            width: '40%',
            height: '100%',
          },
        ],
      },
      {
        name: 'Center 50%',
        layouts: [
          {
            label: 'Left 25%',
            x: '0',
            y: '0',
            width: '25%',
            height: '100%',
          },
          {
            label: 'Center 50%',
            x: '25%',
            y: '0',
            width: '50%',
            height: '100%',
          },
          {
            label: 'Right 25%',
            x: '75%',
            y: '0',
            width: '25%',
            height: '100%',
          },
        ],
      },
      {
        name: 'Right 60%',
        layouts: [
          {
            label: 'Left 40%',
            x: '0',
            y: '0',
            width: '40%',
            height: '100%',
          },
          {
            label: 'Right 60%',
            x: '40%',
            y: '0',
            width: '60%',
            height: '100%',
          },
        ],
      },
    ],
  },
];
