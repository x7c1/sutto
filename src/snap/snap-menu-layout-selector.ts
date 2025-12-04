/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * SnapMenuLayoutSelector
 *
 * Manages layout selection and button highlighting.
 * Handles layout-at-position detection and visual feedback.
 */

import { BUTTON_BG_COLOR, BUTTON_BG_COLOR_SELECTED } from './snap-menu-constants';
import type { Layout } from './types';

// @ts-expect-error - St is used for type annotations
const St = imports.gi.St;

declare function log(message: string): void;

export class SnapMenuLayoutSelector {
  private onLayoutSelected: ((layout: Layout) => void) | null = null;

  /**
   * Set callback for when a layout is selected
   */
  setOnLayoutSelected(callback: (layout: Layout) => void): void {
    this.onLayoutSelected = callback;
  }

  /**
   * Get the callback for layout selection
   */
  getOnLayoutSelected(): ((layout: Layout) => void) | null {
    return this.onLayoutSelected;
  }

  /**
   * Get layout at the given position, or null if position is not over a layout button
   * If multiple layouts overlap at this position, returns the first one found
   */
  getLayoutAtPosition(x: number, y: number, layoutButtons: Map<St.Button, Layout>): Layout | null {
    // Check each layout button to see if position is within its bounds
    for (const [button, layout] of layoutButtons.entries()) {
      const [actorX, actorY] = button.get_transformed_position();
      const [width, height] = button.get_transformed_size();

      if (x >= actorX && x <= actorX + width && y >= actorY && y <= actorY + height) {
        log(`[SnapMenuLayoutSelector] Position (${x}, ${y}) is over layout: ${layout.label}`);
        return layout;
      }
    }

    log(`[SnapMenuLayoutSelector] Position (${x}, ${y}) is not over any layout`);
    return null;
  }

  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the menu
   */
  updateSelectedLayoutHighlight(
    newSelectedLayoutId: string,
    layoutButtons: Map<St.Button, Layout>
  ): void {
    log(`[SnapMenuLayoutSelector] Updating button highlights for layout: ${newSelectedLayoutId}`);
    let updatedCount = 0;

    // Update all button background colors
    for (const [button, layout] of layoutButtons.entries()) {
      const isSelected = layout.id === newSelectedLayoutId;
      const bgColor = isSelected ? BUTTON_BG_COLOR_SELECTED : BUTTON_BG_COLOR;

      // Update button's stored selection state
      const buttonWithMeta = button as any;
      buttonWithMeta._isSelected = isSelected;

      // Access style property through type assertion
      const currentStyle = buttonWithMeta.style || '';

      if (!currentStyle) {
        log(`[SnapMenuLayoutSelector] Warning: Button for layout ${layout.label} has no style`);
        continue;
      }

      // Replace background-color in the style string
      const newStyle = String(currentStyle).replace(
        /background-color:\s*rgba?\([^)]+\)\s*;?/g,
        `background-color: ${bgColor};`
      );

      if (newStyle !== currentStyle) {
        button.set_style(newStyle);
        updatedCount++;
        if (isSelected) {
          log(
            `[SnapMenuLayoutSelector] Set layout ${layout.label} (${layout.id}) to SELECTED (blue)`
          );
        }
      } else {
        log(
          `[SnapMenuLayoutSelector] Warning: Failed to update style for ${layout.label}. Style: ${String(currentStyle).substring(0, 100)}`
        );
      }
    }

    log(`[SnapMenuLayoutSelector] Updated ${updatedCount} button(s) out of ${layoutButtons.size}`);
  }
}
