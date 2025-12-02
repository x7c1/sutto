/// <reference path="../../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Main = imports.ui.main;

import type { DebugConfig } from '../debug-config';
import { evaluate, parse } from '../layout-expression';
import {
  BUTTON_BG_COLOR,
  BUTTON_BG_COLOR_HOVER,
  BUTTON_BORDER_COLOR,
  BUTTON_BORDER_COLOR_HOVER,
  BUTTON_BORDER_WIDTH,
} from '../snap-menu-constants';
import type { Layout } from '../types';

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
 * Get button style based on hover state
 */
function getButtonStyle(
  isHovered: boolean,
  buttonWidth: number,
  buttonHeight: number,
  debugConfig: DebugConfig | null
): string {
  const bgColor = isHovered ? BUTTON_BG_COLOR_HOVER : BUTTON_BG_COLOR;
  const borderColor = isHovered ? BUTTON_BORDER_COLOR_HOVER : BUTTON_BORDER_COLOR;

  // Apply debug configuration for button borders
  const showBorders = !debugConfig || debugConfig.showButtonBorders;
  const borderStyle = showBorders
    ? `border: ${BUTTON_BORDER_WIDTH}px solid ${borderColor};`
    : 'border: none;';

  return `
        background-color: ${bgColor};
        ${borderStyle}
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
  debugConfig: DebugConfig | null,
  onLayoutSelected: (layout: Layout) => void
): LayoutButtonView {
  // Get screen work area for scaling fixed pixel values
  const monitor = global.display.get_current_monitor();
  const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);

  // Calculate button position relative to miniature display
  const buttonX = resolveLayoutValue(layout.x, displayWidth, workArea.width);
  const buttonY = resolveLayoutValue(layout.y, displayHeight, workArea.height);

  // Calculate button dimensions
  const buttonWidth = calculateButtonWidth(layout, displayWidth, workArea.width);
  const buttonHeight =
    resolveLayoutValue(layout.height, displayHeight, workArea.height) - BUTTON_BORDER_WIDTH * 2;

  // Create button with initial style
  const button = new St.Button({
    style_class: 'snap-layout-button',
    style: getButtonStyle(false, buttonWidth, buttonHeight, debugConfig),
    reactive: true,
    can_focus: true,
    track_hover: true,
  });

  // Set position
  button.set_position(buttonX, buttonY);

  // Add size label if debug mode is enabled
  if (debugConfig?.showSizeLabels) {
    const sizeLabel = new St.Label({
      text: `${buttonWidth}×${buttonHeight}`,
      style: `
                color: rgba(255, 255, 255, 0.9);
                font-size: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 2px 4px;
                border-radius: 2px;
            `,
    });
    button.set_child(sizeLabel);
  }

  // Add hover effect
  const enterEventId = button.connect('enter-event', () => {
    button.set_style(getButtonStyle(true, buttonWidth, buttonHeight, debugConfig));
    return false; // Clutter.EVENT_PROPAGATE
  });

  const leaveEventId = button.connect('leave-event', () => {
    button.set_style(getButtonStyle(false, buttonWidth, buttonHeight, debugConfig));
    return false; // Clutter.EVENT_PROPAGATE
  });

  // Connect click event
  const clickEventId = button.connect('button-press-event', () => {
    log(`[SnapMenu] Layout selected: ${layout.label}`);
    onLayoutSelected(layout);
    return true; // Clutter.EVENT_STOP
  });

  return { button, enterEventId, leaveEventId, clickEventId };
}
