import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { Layout, LayoutSelectedEvent } from '../../domain/layout/index.js';
import { resolveRect } from '../../domain/layout-expression/index.js';
import {
  BUTTON_BG_COLOR,
  BUTTON_BG_COLOR_HOVER,
  BUTTON_BG_COLOR_SELECTED,
  BUTTON_BORDER_COLOR,
  BUTTON_BORDER_COLOR_HOVER,
  BUTTON_BORDER_WIDTH,
} from '../constants.js';
import type { LayoutButtonWithMetadata } from '../types/button.js';

declare function log(message: string): void;

export interface LayoutButtonView {
  button: St.Button;
  enterEventId: number;
  leaveEventId: number;
  clickEventId: number;
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
  onLayoutSelected: (event: LayoutSelectedEvent) => void,
  monitorIndex: number,
  monitorKey: string
): LayoutButtonView {
  // Get screen work area for scaling fixed pixel values
  const workArea = Main.layoutManager.getWorkAreaForMonitor(monitorIndex);

  // Resolve the tile rectangle relative to the miniature display
  const rect = resolveRect(layout, { width: displayWidth, height: displayHeight }, workArea);

  // CSS width/height exclude the border, so subtract it to keep the outer size equal to rect
  const buttonWidth = rect.width - BUTTON_BORDER_WIDTH * 2;
  const buttonHeight = rect.height - BUTTON_BORDER_WIDTH * 2;

  // Create button with initial style (not hovered, but might be selected)
  const button = new St.Button({
    style_class: 'snap-layout-button',
    style: getButtonStyle(false, isSelected, buttonWidth, buttonHeight),
    reactive: true,
    can_focus: true,
    track_hover: true,
    cursor_type: Clutter.CursorType.POINTER,
  });

  // Set position
  button.set_position(rect.x, rect.y);

  // Store button metadata for dynamic style updates
  const buttonWithMeta = button as LayoutButtonWithMetadata;
  buttonWithMeta._isSelected = isSelected;
  buttonWithMeta._isFocused = false;
  buttonWithMeta._buttonWidth = buttonWidth;
  buttonWithMeta._buttonHeight = buttonHeight;
  buttonWithMeta._monitorKey = monitorKey;

  // Add hover effect
  const enterEventId = button.connect('enter-event', () => {
    // Only apply hover style if not keyboard-focused
    if (!buttonWithMeta._isFocused) {
      button.set_style(
        getButtonStyle(true, buttonWithMeta._isSelected ?? false, buttonWidth, buttonHeight)
      );
    }
    return false; // Clutter.EVENT_PROPAGATE
  });

  const leaveEventId = button.connect('leave-event', () => {
    // Only remove hover style if not keyboard-focused
    if (!buttonWithMeta._isFocused) {
      button.set_style(
        getButtonStyle(false, buttonWithMeta._isSelected ?? false, buttonWidth, buttonHeight)
      );
    }
    return false; // Clutter.EVENT_PROPAGATE
  });

  // Connect click event
  const clickEventId = button.connect('button-press-event', () => {
    log(`[MainPanel] Layout selected: ${layout.label}`);
    onLayoutSelected({ layout, monitorKey });
    return true; // Clutter.EVENT_STOP
  });

  return { button, enterEventId, leaveEventId, clickEventId };
}
