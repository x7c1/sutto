import type St from 'gi://St';

import type { DebugConfig } from '../debug-panel/config.js';

/**
 * Extended St.Button with layout button metadata
 *
 * Used for layout selection buttons with custom properties for:
 * - Selection state tracking
 * - Keyboard focus state
 * - Button dimensions for styling
 * - Debug configuration
 */
export interface LayoutButtonWithMetadata extends St.Button {
  _isSelected?: boolean;
  _isFocused?: boolean;
  _buttonWidth?: number;
  _buttonHeight?: number;
  _debugConfig?: DebugConfig | null;
}

/**
 * Extended St.Button with checkbox button metadata
 *
 * Used for debug panel checkbox buttons with custom properties for:
 * - Checked state tracking
 * - Reference to checkbox indicator widget
 */
export interface CheckboxButtonWithMetadata extends St.Button {
  _checked: boolean;
  _checkboxIndicator: St.Widget;
}
