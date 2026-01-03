import Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
  FOOTER_MARGIN_TOP,
  FOOTER_TEXT_COLOR,
  PANEL_BG_COLOR,
  PANEL_BORDER_COLOR,
  PANEL_PADDING,
} from '../constants.js';
import type { DebugConfig } from '../debug-panel/config.js';
import type { Layout, LayoutGroupCategory } from '../types/index.js';
import { createCategoryView } from '../ui/index.js';

declare function log(message: string): void;

export interface PanelEventIds {
  clickOutsideId: number;
  buttonEvents: Array<{
    button: St.Button;
    enterEventId: number;
    leaveEventId: number;
    clickEventId: number;
  }>;
}

export interface BackgroundView {
  background: St.BoxLayout;
  clickOutsideId: number;
}

export interface CategoriesView {
  categoriesContainer: St.BoxLayout;
  layoutButtons: Map<St.Button, Layout>;
  buttonEvents: PanelEventIds['buttonEvents'];
}

/**
 * Create background overlay to capture clicks outside panel
 */
export function createBackground(onClickOutside: () => void): BackgroundView {
  const background = new St.BoxLayout({
    style: 'background-color: rgba(0, 0, 0, 0);',
    reactive: true,
    x: 0,
    y: 0,
    width: global.screen_width,
    height: global.screen_height,
  });

  // Add background first (behind panel)
  Main.layoutManager.addChrome(background, {
    affectsInputRegion: true,
    trackFullscreen: false,
  });

  // Connect click on background to close panel
  const clickOutsideId = background.connect('button-press-event', () => {
    log('[MainPanel] Click on background, hiding panel');
    onClickOutside();
    return true; // Stop event propagation
  });

  return { background, clickOutsideId };
}

/**
 * Create footer with app name and settings button
 */
export function createFooter(onSettingsClick: () => void): St.BoxLayout {
  // Settings button style constants
  const SETTINGS_ICON_SIZE = 16;
  const SETTINGS_MARGIN = 8;
  const SETTINGS_PADDING_VERTICAL = 2;
  const SETTINGS_PADDING_HORIZONTAL = 4;
  const SETTINGS_BORDER_RADIUS = 4;

  const footerBox = new St.BoxLayout({
    style: `
      margin-top: ${FOOTER_MARGIN_TOP}px;
    `,
    vertical: false,
    y_align: 2, // CENTER (vertically align children)
  });

  // Left spacer to balance the settings button on the right
  const leftSpacer = new St.Bin({
    style: `
      margin-right: ${SETTINGS_MARGIN}px;
      padding: ${SETTINGS_PADDING_VERTICAL}px ${SETTINGS_PADDING_HORIZONTAL}px;
      width: ${SETTINGS_ICON_SIZE}px;
    `,
  });

  // Text label
  const label = new St.Label({
    text: 'Powered by Snappa',
    style: `
      font-size: 12px;
      font-family: "DejaVu Sans Condensed";
      color: ${FOOTER_TEXT_COLOR};
    `,
    x_expand: true, // Expand to fill available space
    x_align: 2, // CENTER (horizontally center the text)
    y_align: 2, // CENTER (vertically center the label)
  });

  // Settings icon button
  const settingsButton = new St.Button({
    style_class: 'snappa-settings-icon',
    style: `
      margin-left: ${SETTINGS_MARGIN}px;
      padding: ${SETTINGS_PADDING_VERTICAL}px ${SETTINGS_PADDING_HORIZONTAL}px;
      border-radius: ${SETTINGS_BORDER_RADIUS}px;
    `,
    track_hover: true,
    y_align: 2, // CENTER (vertically center the button)
  });

  const icon = new St.Icon({
    icon_name: 'preferences-system-symbolic', // GNOME standard settings icon
    icon_size: SETTINGS_ICON_SIZE,
    style: `color: ${FOOTER_TEXT_COLOR};`,
  });

  settingsButton.set_child(icon);

  settingsButton.connect('clicked', () => {
    log('[Renderer] Settings button clicked event fired');
    onSettingsClick();
    return true; // Clutter.EVENT_STOP
  });

  // Hover effect
  settingsButton.connect('enter-event', () => {
    log('[Renderer] Settings button hover enter');
    settingsButton.style = `
      margin-left: ${SETTINGS_MARGIN}px;
      padding: ${SETTINGS_PADDING_VERTICAL}px ${SETTINGS_PADDING_HORIZONTAL}px;
      border-radius: ${SETTINGS_BORDER_RADIUS}px;
      background-color: rgba(255, 255, 255, 0.1);
    `;
    global.display.set_cursor(Meta.Cursor.POINTING_HAND);
  });

  settingsButton.connect('leave-event', () => {
    settingsButton.style = `
      margin-left: ${SETTINGS_MARGIN}px;
      padding: ${SETTINGS_PADDING_VERTICAL}px ${SETTINGS_PADDING_HORIZONTAL}px;
      border-radius: ${SETTINGS_BORDER_RADIUS}px;
    `;
    global.display.set_cursor(Meta.Cursor.DEFAULT);
  });

  footerBox.add_child(leftSpacer);
  footerBox.add_child(label);
  footerBox.add_child(settingsButton);

  return footerBox;
}

/**
 * Create categories view with category-based rendering
 */
export function createCategoriesView(
  displayWidth: number,
  displayHeight: number,
  categories: LayoutGroupCategory[],
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout) => void
): CategoriesView {
  const categoriesContainer = new St.BoxLayout({
    style_class: 'snap-categories-container',
    vertical: true, // Vertical layout: stack categories
    x_expand: false,
    y_expand: false,
  });

  const layoutButtons = new Map<St.Button, Layout>();
  const buttonEvents: PanelEventIds['buttonEvents'] = [];

  // Create one category view for each category
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const isLastCategory = i === categories.length - 1;
    const view = createCategoryView(
      category,
      displayWidth,
      displayHeight,
      debugConfig,
      window,
      onLayoutSelected,
      isLastCategory
    );
    categoriesContainer.add_child(view.categoryContainer);

    // Collect layout buttons and events
    for (const [button, layout] of view.layoutButtons) {
      layoutButtons.set(button, layout);
    }
    buttonEvents.push(...view.buttonEvents);
  }

  return { categoriesContainer, layoutButtons, buttonEvents };
}

/**
 * Create main panel container
 */
export function createPanelContainer(): St.BoxLayout {
  const container = new St.BoxLayout({
    style_class: 'main-panel',
    style: `
      background-color: ${PANEL_BG_COLOR};
      border: 2px solid ${PANEL_BORDER_COLOR};
      border-radius: 8px;
      padding: ${PANEL_PADDING}px ${PANEL_PADDING}px ${PANEL_PADDING / 2}px ${PANEL_PADDING}px;
    `,
    vertical: true,
    visible: true,
    reactive: true,
    can_focus: true,
    track_hover: true,
  });

  return container;
}
