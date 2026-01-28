import type St from 'gi://St';

/**
 * Extended St.Button with layout button metadata
 *
 * Used for layout selection buttons with custom properties for:
 * - Selection state tracking
 * - Keyboard focus state
 * - Button dimensions for styling
 */
export interface LayoutButtonWithMetadata extends St.Button {
  _isSelected?: boolean;
  _isFocused?: boolean;
  _buttonWidth?: number;
  _buttonHeight?: number;
  _monitorKey?: string;
  _rowIndex?: number;
}
