import Clutter from 'gi://Clutter';
import type St from 'gi://St';

import type { LayoutButtonWithMetadata } from '../types/button.js';
import type { Layout } from '../types/layout.js';
import { getButtonStyle } from '../ui/layout-button.js';

declare function log(message: string): void;

interface ParsedShortcut {
  keyval: number;
  modifiers: Clutter.ModifierType;
}

/**
 * Parse accelerator string (e.g., '<Control>comma') into keyval and modifiers
 */
function parseAccelerator(accelerator: string): ParsedShortcut | null {
  let remaining = accelerator;
  let modifiers: Clutter.ModifierType = 0;

  // Extract modifiers
  const modifierPattern = /<(\w+)>/g;
  let match: RegExpExecArray | null = modifierPattern.exec(accelerator);
  while (match !== null) {
    const mod = match[1].toLowerCase();
    if (mod === 'control' || mod === 'ctrl') {
      modifiers |= Clutter.ModifierType.CONTROL_MASK;
    } else if (mod === 'shift') {
      modifiers |= Clutter.ModifierType.SHIFT_MASK;
    } else if (mod === 'alt') {
      modifiers |= Clutter.ModifierType.MOD1_MASK;
    } else if (mod === 'super') {
      modifiers |= Clutter.ModifierType.SUPER_MASK;
    }
    remaining = remaining.replace(match[0], '');
    match = modifierPattern.exec(accelerator);
  }

  // Remaining string is the key name
  const keyName = remaining.trim().toLowerCase();
  if (!keyName) return null;

  // Map key name to Clutter keyval
  const keyMap: { [key: string]: number } = {
    comma: Clutter.KEY_comma,
    period: Clutter.KEY_period,
    slash: Clutter.KEY_slash,
    semicolon: Clutter.KEY_semicolon,
    apostrophe: Clutter.KEY_apostrophe,
    bracketleft: Clutter.KEY_bracketleft,
    bracketright: Clutter.KEY_bracketright,
    backslash: Clutter.KEY_backslash,
    minus: Clutter.KEY_minus,
    equal: Clutter.KEY_equal,
    grave: Clutter.KEY_grave,
    space: Clutter.KEY_space,
    return: Clutter.KEY_Return,
    escape: Clutter.KEY_Escape,
    tab: Clutter.KEY_Tab,
    backspace: Clutter.KEY_BackSpace,
  };

  // Check special key names first
  if (keyMap[keyName]) {
    return { keyval: keyMap[keyName], modifiers };
  }

  // Single character keys (a-z, 0-9)
  if (keyName.length === 1) {
    const char = keyName.charCodeAt(0);
    if (char >= 97 && char <= 122) {
      // a-z
      return { keyval: Clutter.KEY_a + (char - 97), modifiers };
    }
    if (char >= 48 && char <= 57) {
      // 0-9
      return { keyval: Clutter.KEY_0 + (char - 48), modifiers };
    }
  }

  return null;
}

interface Point {
  x: number;
  y: number;
}

interface EdgeMidpoints {
  left: Point;
  right: Point;
  top: Point;
  bottom: Point;
}

interface ButtonPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KeyboardNavigatorOptions {
  container: St.BoxLayout;
  layoutButtons: Map<St.Button, Layout>;
  onLayoutSelected: (layout: Layout) => void;
  onOpenPreferences: () => void;
  openPreferencesShortcuts: string[];
}

export class MainPanelKeyboardNavigator {
  private container: St.BoxLayout | null = null;
  private focusedButton: St.Button | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private keyEventId: number | null = null;
  private onLayoutSelected: ((layout: Layout) => void) | null = null;
  private onOpenPreferences: (() => void) | null = null;
  private parsedShortcuts: ParsedShortcut[] = [];

  enable(options: KeyboardNavigatorOptions): void {
    this.container = options.container;
    this.layoutButtons = options.layoutButtons;
    this.onLayoutSelected = options.onLayoutSelected;
    this.onOpenPreferences = options.onOpenPreferences;

    // Parse shortcuts
    this.parsedShortcuts = [];
    for (const shortcut of options.openPreferencesShortcuts) {
      const parsed = parseAccelerator(shortcut);
      if (parsed) {
        this.parsedShortcuts.push(parsed);
      }
    }

    // Set keyboard focus
    this.container.grab_key_focus();

    // Register key event handler
    this.keyEventId = this.container.connect(
      'key-press-event',
      (_actor: St.BoxLayout, event: Clutter.Event) => {
        return this.handleKeyPress(event);
      }
    );
    this.focusedButton = this.initializeFocus();
  }

  disable(): void {
    if (this.keyEventId !== null && this.container) {
      this.container.disconnect(this.keyEventId);
      this.keyEventId = null;
    }

    if (this.focusedButton) {
      this.removeFocusStyle(this.focusedButton);
      this.focusedButton = null;
    }

    this.container = null;
    // Do not clear layoutButtons, as it's a reference from MainPanel
  }

  /**
   * Initialize focus to selected layout if exists
   * Does not apply focus if no layout is selected (focus starts on first key press)
   */
  private initializeFocus(): St.Button | null {
    // Find selected button if exists
    for (const [button] of this.layoutButtons.entries()) {
      if (!button.reactive) continue;
      const buttonWithMeta = button as LayoutButtonWithMetadata;
      if (buttonWithMeta._isSelected) {
        this.applyFocusStyle(button);
        return button;
      }
    }

    // No selected button - don't apply initial focus
    // Focus will be applied when user starts keyboard navigation
    return null;
  }

  /**
   * Find the top-left button for initial focus when no button is selected
   */
  private findTopLeftButton(): St.Button | null {
    let topLeftButton: St.Button | null = null;
    let minY = Infinity;
    let minX = Infinity;

    for (const button of this.layoutButtons.keys()) {
      if (!button.reactive) continue;
      const [x, y] = button.get_transformed_position();

      if (y < minY || (y === minY && x < minX)) {
        minY = y;
        minX = x;
        topLeftButton = button;
      }
    }

    return topLeftButton;
  }

  /**
   * Get button position and size
   */
  private getButtonPosition(button: St.Button): ButtonPosition {
    const [x, y] = button.get_transformed_position();
    const [width, height] = button.get_size();
    return { x, y, width, height };
  }

  /**
   * Calculate edge midpoints for a button
   */
  private calculateEdgeMidpoints(pos: ButtonPosition): EdgeMidpoints {
    return {
      left: { x: pos.x, y: pos.y + pos.height / 2 },
      right: { x: pos.x + pos.width, y: pos.y + pos.height / 2 },
      top: { x: pos.x + pos.width / 2, y: pos.y },
      bottom: { x: pos.x + pos.width / 2, y: pos.y + pos.height },
    };
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private distance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  private handleKeyPress(event: Clutter.Event): boolean {
    const symbol = event.get_key_symbol();
    const state = event.get_state();

    // Check if event matches any configured open-preferences shortcut
    if (this.matchesShortcut(symbol, state)) {
      this.onOpenPreferences?.();
      return true;
    }

    const keyMap: { [key: number]: string } = {
      [Clutter.KEY_Up]: 'up',
      [Clutter.KEY_Down]: 'down',
      [Clutter.KEY_Left]: 'left',
      [Clutter.KEY_Right]: 'right',
      [Clutter.KEY_Return]: 'select',
      [Clutter.KEY_KP_Enter]: 'select',
    };

    const ctrlKeyMap: { [key: number]: string } = {
      [Clutter.KEY_p]: 'up',
      [Clutter.KEY_n]: 'down',
      [Clutter.KEY_b]: 'left',
      [Clutter.KEY_f]: 'right',
    };

    const hasCtrl = (state & Clutter.ModifierType.CONTROL_MASK) !== 0;
    const direction = hasCtrl ? ctrlKeyMap[symbol] : keyMap[symbol];
    if (!direction) return false; // Propagate event

    if (direction === 'select') {
      this.selectCurrentButton();
    } else {
      this.moveFocus(direction);
    }

    return true; // Stop event
  }

  /**
   * Move focus in the specified direction using midpoint-based distance calculation
   */
  private moveFocus(direction: string): void {
    // If no focus yet, initialize to top-left button on first key press
    if (!this.focusedButton) {
      const topLeft = this.findTopLeftButton();
      if (topLeft) {
        this.focusedButton = topLeft;
        this.applyFocusStyle(topLeft);
      }
      return;
    }

    const nextButton = this.findNextLayout(direction);
    if (nextButton) {
      // Remove current focus
      this.removeFocusStyle(this.focusedButton);

      // Apply new focus
      this.focusedButton = nextButton;
      this.applyFocusStyle(nextButton);
    }
    // If no candidate found, focus remains on current layout (no wrap-around)
  }

  /**
   * Check if the key event matches any of the configured shortcuts
   */
  private matchesShortcut(keyval: number, state: Clutter.ModifierType): boolean {
    // Mask to only include relevant modifiers
    const relevantMask =
      Clutter.ModifierType.CONTROL_MASK |
      Clutter.ModifierType.SHIFT_MASK |
      Clutter.ModifierType.MOD1_MASK |
      Clutter.ModifierType.SUPER_MASK;
    const eventModifiers = state & relevantMask;

    for (const shortcut of this.parsedShortcuts) {
      if (keyval === shortcut.keyval && eventModifiers === shortcut.modifiers) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find next layout in the specified direction using midpoint-based distance calculation
   */
  private findNextLayout(direction: string): St.Button | null {
    if (!this.focusedButton) {
      return null;
    }

    const currentPos = this.getButtonPosition(this.focusedButton);
    const currentMidpoints = this.calculateEdgeMidpoints(currentPos);

    let sourceMidpoint: Point;
    let getTargetMidpoint: (pos: ButtonPosition) => Point;
    let isInDirection: (targetMidpoint: Point) => boolean;
    const buffer = 5;

    // Determine source edge, target edge, and directional constraint based on direction
    switch (direction) {
      case 'right':
        sourceMidpoint = currentMidpoints.right;
        getTargetMidpoint = (pos) => this.calculateEdgeMidpoints(pos).left;
        isInDirection = (targetMidpoint) => targetMidpoint.x + buffer >= sourceMidpoint.x;
        break;
      case 'left':
        sourceMidpoint = currentMidpoints.left;
        getTargetMidpoint = (pos) => this.calculateEdgeMidpoints(pos).right;
        isInDirection = (targetMidpoint) => targetMidpoint.x - buffer <= sourceMidpoint.x;
        break;
      case 'down':
        sourceMidpoint = currentMidpoints.bottom;
        getTargetMidpoint = (pos) => this.calculateEdgeMidpoints(pos).top;
        isInDirection = (targetMidpoint) => targetMidpoint.y + buffer >= sourceMidpoint.y;
        break;
      case 'up':
        sourceMidpoint = currentMidpoints.top;
        getTargetMidpoint = (pos) => this.calculateEdgeMidpoints(pos).bottom;
        isInDirection = (targetMidpoint) => targetMidpoint.y - buffer <= sourceMidpoint.y;
        break;
      default:
        return null;
    }

    // Find closest layout in the specified direction
    let closestButton: St.Button | null = null;
    let minDistance = Infinity;
    for (const [button, layout] of this.layoutButtons.entries()) {
      layout; // Prevent unused variable warning
      // Skip current button and inactive buttons
      if (button === this.focusedButton || !button.reactive) {
        continue;
      }

      const pos = this.getButtonPosition(button);
      const targetMidpoint = getTargetMidpoint(pos);

      // Check if button is in the intended direction
      if (!isInDirection(targetMidpoint)) {
        continue;
      }

      // Calculate distance
      const dist = this.distance(sourceMidpoint, targetMidpoint);
      if (dist < minDistance) {
        minDistance = dist;
        closestButton = button;
      }
    }

    return closestButton;
  }

  private applyFocusStyle(button: St.Button): void {
    const buttonWithMeta = button as LayoutButtonWithMetadata;

    // Mark button as keyboard-focused
    buttonWithMeta._isFocused = true;

    // Apply focused style (same as hover style)
    const style = getButtonStyle(
      true, // isHovered = true to apply hover style
      buttonWithMeta._isSelected ?? false,
      buttonWithMeta._buttonWidth ?? 0,
      buttonWithMeta._buttonHeight ?? 0
    );
    button.set_style(style);
  }

  private removeFocusStyle(button: St.Button): void {
    const buttonWithMeta = button as LayoutButtonWithMetadata;

    // Remove keyboard focus flag
    buttonWithMeta._isFocused = false;

    // Restore normal style
    const style = getButtonStyle(
      false, // isHovered = false
      buttonWithMeta._isSelected ?? false,
      buttonWithMeta._buttonWidth ?? 0,
      buttonWithMeta._buttonHeight ?? 0
    );
    button.set_style(style);
  }

  private selectCurrentButton(): void {
    if (!this.focusedButton) return;

    const layout = this.layoutButtons.get(this.focusedButton);
    if (!layout || !this.onLayoutSelected) return;

    this.onLayoutSelected(layout);
  }
}
