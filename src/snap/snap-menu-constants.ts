import type { SnapLayoutGroup } from './snap-menu-types';

// Timing
export const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding menu when cursor leaves

// Dimensions
export const MINIATURE_DISPLAY_WIDTH = 300; // Fixed width for miniature displays
export const MENU_PADDING = 12; // Padding around menu content
export const DISPLAY_SPACING = 12; // Spacing between miniature displays
export const BUTTON_BORDER_WIDTH = 1; // Border width for layout buttons
export const FOOTER_MARGIN_TOP = 12; // Margin above footer

// Colors
export const MENU_BG_COLOR = 'rgba(40, 40, 40, 0.95)';
export const MENU_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
export const DISPLAY_BG_COLOR = 'rgba(20, 20, 20, 0.9)';
export const BUTTON_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
export const BUTTON_BG_COLOR_HOVER = 'rgba(120, 120, 120, 0.8)';
export const BUTTON_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
export const BUTTON_BORDER_COLOR_HOVER = 'rgba(255, 255, 255, 0.6)';
export const FOOTER_TEXT_COLOR = 'rgba(255, 255, 255, 0.5)';

// Default layout groups
export const DEFAULT_LAYOUT_GROUPS: SnapLayoutGroup[] = [
    {
        name: 'Three-Way Split',
        layouts: [
            {
                label: 'Left Third',
                x: 0,
                y: 0,
                width: 0.333,
                height: 1,
                zIndex: 0,
            },
            {
                label: 'Center Third',
                x: 0.333,
                y: 0,
                width: 0.334,
                height: 1,
                zIndex: 0,
            },
            {
                label: 'Right Third',
                x: 0.667,
                y: 0,
                width: 0.333,
                height: 1,
                zIndex: 0,
            },
        ],
    },
    {
        name: 'Center Half',
        layouts: [
            {
                label: 'Center Half',
                x: 0.25,
                y: 0,
                width: 0.5,
                height: 1,
                zIndex: 0,
            },
        ],
    },
    {
        name: 'Two-Way Split',
        layouts: [
            {
                label: 'Left Half',
                x: 0,
                y: 0,
                width: 0.5,
                height: 1,
                zIndex: 0,
            },
            {
                label: 'Right Half',
                x: 0.5,
                y: 0,
                width: 0.5,
                height: 1,
                zIndex: 0,
            },
        ],
    },
];
