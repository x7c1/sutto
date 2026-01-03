import Clutter from 'gi://Clutter';
import St from 'gi://St';

import type { Layout } from '../types/layout.js';
import { getButtonStyle } from '../ui/layout-button.js';

declare function log(message: string): void;

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

export class MainPanelKeyboardNavigator {
  private container: St.BoxLayout | null = null;
  private focusedButton: St.Button | null = null;
  private layoutButtons: Map<St.Button, Layout> = new Map();
  private keyEventId: number | null = null;
  private onLayoutSelected: ((layout: Layout) => void) | null = null;

  enable(
    container: St.BoxLayout,
    layoutButtons: Map<St.Button, Layout>,
    onLayoutSelected: (layout: Layout) => void
  ): void {
    this.container = container;
    this.layoutButtons = layoutButtons;
    this.onLayoutSelected = onLayoutSelected;

    // Set keyboard focus
    (container as any).grab_key_focus();

    // Register key event handler
    this.keyEventId = container.connect('key-press-event', (_actor: St.BoxLayout, event: any) => {
      return this.handleKeyPress(event);
    });
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
   * Initialize focus to selected layout if exists, otherwise top-left layout
   */
  private initializeFocus(): St.Button | null {
    let initialButton: St.Button | null = null;

    // Find selected button if exists
    for (const [button, layout] of this.layoutButtons.entries()) {
      St; // Prevent unused variable warning
      layout; // Prevent unused variable warning
      const buttonWithMeta = button as any;
      if (buttonWithMeta._isSelected) {
        initialButton = button;
        break;
      }
    }

    // If no selected button, find top-left button
    if (!initialButton) {
      let minY = Infinity;
      let minX = Infinity;
      for (const button of this.layoutButtons.keys()) {
        const allocation = (button as any).get_allocation_box();
        const x = allocation.x1;
        const y = allocation.y1;

        if (y < minY || (y === minY && x < minX)) {
          minY = y;
          minX = x;
          initialButton = button;
        }
      }
    }

    if (initialButton) {
      this.applyFocusStyle(initialButton);
    }
    return initialButton;
  }

  /**
   * Get button position and size
   */
  private getButtonPosition(button: St.Button): ButtonPosition {
    const [x, y] = (button as any).get_transformed_position();
    const [width, height] = (button as any).get_size();
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

  private handleKeyPress(event: any): boolean {
    const symbol = event.get_key_symbol();

    const keyMap: { [key: number]: string } = {
      [Clutter.KEY_Up]: 'up',
      [Clutter.KEY_Down]: 'down',
      [Clutter.KEY_Left]: 'left',
      [Clutter.KEY_Right]: 'right',
      [Clutter.KEY_k]: 'up',
      [Clutter.KEY_j]: 'down',
      [Clutter.KEY_h]: 'left',
      [Clutter.KEY_l]: 'right',
      [Clutter.KEY_Return]: 'select',
      [Clutter.KEY_KP_Enter]: 'select',
    };

    const direction = keyMap[symbol];
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
    if (!this.focusedButton) {
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
      // Skip current button
      if (button === this.focusedButton) {
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
    const buttonWithMeta = button as any;

    // Mark button as keyboard-focused
    buttonWithMeta._isFocused = true;

    // Apply focused style (same as hover style)
    const style = getButtonStyle(
      true, // isHovered = true to apply hover style
      buttonWithMeta._isSelected,
      buttonWithMeta._buttonWidth,
      buttonWithMeta._buttonHeight,
      buttonWithMeta._debugConfig
    );
    button.set_style(style);
  }

  private removeFocusStyle(button: St.Button): void {
    const buttonWithMeta = button as any;

    // Remove keyboard focus flag
    buttonWithMeta._isFocused = false;

    // Restore normal style
    const style = getButtonStyle(
      false, // isHovered = false
      buttonWithMeta._isSelected,
      buttonWithMeta._buttonWidth,
      buttonWithMeta._buttonHeight,
      buttonWithMeta._debugConfig
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
