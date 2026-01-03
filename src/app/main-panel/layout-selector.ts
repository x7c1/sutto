/**
 * MainPanelLayoutSelector
 *
 * Manages layout selection and button highlighting.
 * Handles layout-at-position detection and visual feedback.
 */

import type St from 'gi://St';
import { BUTTON_BG_COLOR, BUTTON_BG_COLOR_SELECTED } from '../constants.js';
import type { Layout } from '../types/index.js';

declare function log(message: string): void;

export class MainPanelLayoutSelector {
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
        log(`[MainPanelLayoutSelector] Position (${x}, ${y}) is over layout: ${layout.label}`);
        return layout;
      }
    }

    log(`[MainPanelLayoutSelector] Position (${x}, ${y}) is not over any layout`);
    return null;
  }

  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the panel
   */
  updateSelectedLayoutHighlight(
    newSelectedLayoutId: string,
    layoutButtons: Map<St.Button, Layout>
  ): void {
    log(`[MainPanelLayoutSelector] Updating button highlights for layout: ${newSelectedLayoutId}`);
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
        log(`[MainPanelLayoutSelector] Warning: Button for layout ${layout.label} has no style`);
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
            `[MainPanelLayoutSelector] Set layout ${layout.label} (${layout.id}) to SELECTED (blue)`
          );
        }
      } else {
        log(
          `[MainPanelLayoutSelector] Warning: Failed to update style for ${layout.label}. Style: ${String(currentStyle).substring(0, 100)}`
        );
      }
    }

    log(`[MainPanelLayoutSelector] Updated ${updatedCount} button(s) out of ${layoutButtons.size}`);
  }
}
