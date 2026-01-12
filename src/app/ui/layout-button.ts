import Meta from 'gi://Meta';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  BUTTON_BG_COLOR,
  BUTTON_BG_COLOR_HOVER,
  BUTTON_BG_COLOR_SELECTED,
  BUTTON_BORDER_COLOR,
  BUTTON_BORDER_COLOR_HOVER,
  BUTTON_BORDER_WIDTH,
} from '../constants.js';
import { evaluate, parse } from '../layout-expression/index.js';
import type { LayoutButtonWithMetadata } from '../types/button.js';
import type { Layout } from '../types/index.js';

declare function log(message: string): void;

export interface LayoutButtonView {
  button: St.Button;
  enterEventId: number;
  leaveEventId: number;
  clickEventId: number;
}

/**
 * Resolve layout value (string expression) to pixels
 * @param value - Layout expression ('1/3', '50%', '100px', '50% - 10px', etc.)
 * @param containerSize - Container size in pixels (miniature display width or height)
 * @param screenSize - Optional screen size for scaling fixed pixel values
 * @returns Resolved pixel value
 */
function resolveLayoutValue(value: string, containerSize: number, screenSize?: number): number {
  const expr = parse(value);
  return evaluate(expr, containerSize, screenSize);
}

/**
 * Calculate button width based on layout width
 */
function calculateButtonWidth(layout: Layout, displayWidth: number, screenWidth?: number): number {
  const layoutWidth = resolveLayoutValue(layout.width, displayWidth, screenWidth);
  return layoutWidth - BUTTON_BORDER_WIDTH * 2;
}

/**
 * Get button style based on hover state and selection state
 * Color priority: Hover > Selected > Normal
 */
export function getButtonStyle(
  isHovered: boolean,
  isSelected: boolean,
  buttonWidth: number,
  buttonHeight: number
): string {
  // Color priority: Hover > Selected > Normal
  let bgColor: string;
  if (isHovered) {
    bgColor = BUTTON_BG_COLOR_HOVER;
  } else if (isSelected) {
    bgColor = BUTTON_BG_COLOR_SELECTED;
  } else {
    bgColor = BUTTON_BG_COLOR;
  }

  const borderColor = isHovered ? BUTTON_BORDER_COLOR_HOVER : BUTTON_BORDER_COLOR;

  return `
        background-color: ${bgColor};
        border: ${BUTTON_BORDER_WIDTH}px solid ${borderColor};
        border-radius: 2px;
        width: ${buttonWidth}px;
        height: ${buttonHeight}px;
        margin: 0;
        padding: 0;
    `;
}

/**
 * Create a layout button
 */
export function createLayoutButton(
  layout: Layout,
  displayWidth: number,
  displayHeight: number,
  isSelected: boolean,
  onLayoutSelected: (layout: Layout) => void,
  monitorIndex: number
): LayoutButtonView {
  // Get screen work area for scaling fixed pixel values
  const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

  // Calculate button position relative to miniature display
  const buttonX = resolveLayoutValue(layout.x, displayWidth, workArea.width);
  const buttonY = resolveLayoutValue(layout.y, displayHeight, workArea.height);

  // Calculate button dimensions
  const buttonWidth = calculateButtonWidth(layout, displayWidth, workArea.width);
  const buttonHeight =
    resolveLayoutValue(layout.height, displayHeight, workArea.height) - BUTTON_BORDER_WIDTH * 2;

  // Create button with initial style (not hovered, but might be selected)
  const button = new St.Button({
    style_class: 'snap-layout-button',
    style: getButtonStyle(false, isSelected, buttonWidth, buttonHeight),
    reactive: true,
    can_focus: true,
    track_hover: true,
  });

  // Set position
  button.set_position(buttonX, buttonY);

  // Store button metadata for dynamic style updates
  const buttonWithMeta = button as LayoutButtonWithMetadata;
  buttonWithMeta._isSelected = isSelected;
  buttonWithMeta._isFocused = false;
  buttonWithMeta._buttonWidth = buttonWidth;
  buttonWithMeta._buttonHeight = buttonHeight;

  // Add hover effect
  const enterEventId = button.connect('enter-event', () => {
    // Only apply hover style if not keyboard-focused
    if (!buttonWithMeta._isFocused) {
      button.set_style(
        getButtonStyle(true, buttonWithMeta._isSelected ?? false, buttonWidth, buttonHeight)
      );
    }
    global.display.set_cursor(Meta.Cursor.POINTING_HAND);
    return false; // Clutter.EVENT_PROPAGATE
  });

  const leaveEventId = button.connect('leave-event', () => {
    // Only remove hover style if not keyboard-focused
    if (!buttonWithMeta._isFocused) {
      button.set_style(
        getButtonStyle(false, buttonWithMeta._isSelected ?? false, buttonWidth, buttonHeight)
      );
    }
    global.display.set_cursor(Meta.Cursor.DEFAULT);
    return false; // Clutter.EVENT_PROPAGATE
  });

  // Connect click event
  const clickEventId = button.connect('button-press-event', () => {
    log(`[MainPanel] Layout selected: ${layout.label}`);
    onLayoutSelected(layout);
    return true; // Clutter.EVENT_STOP
  });

  return { button, enterEventId, leaveEventId, clickEventId };
}
