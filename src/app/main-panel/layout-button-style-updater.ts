/**
 * LayoutButtonStyleUpdater
 *
 * Updates button styles to reflect layout selection state.
 */

import type St from 'gi://St';
import { BUTTON_BG_COLOR, BUTTON_BG_COLOR_SELECTED } from '../constants.js';
import type { LayoutButtonWithMetadata } from '../types/button.js';
import type { Layout } from '../types/index.js';

declare function log(message: string): void;

export class LayoutButtonStyleUpdater {
  /**
   * Update button styles when a layout is selected
   * Called after layout selection to immediately reflect the change in the panel
   * Highlights only the selected layout on the specified monitor, clears all other highlights
   */
  updateSelectedLayoutHighlight(
    newSelectedLayoutId: string,
    monitorKey: string,
    layoutButtons: Map<St.Button, Layout>
  ): void {
    log(
      `[LayoutButtonStyleUpdater] Updating button highlights for layout: ${newSelectedLayoutId} on monitor: ${monitorKey}`
    );
    let updatedCount = 0;

    // Update all buttons: only highlight the selected layout on the selected monitor
    for (const [button, layout] of layoutButtons.entries()) {
      const buttonWithMeta = button as LayoutButtonWithMetadata;
      const buttonMonitorKey = buttonWithMeta._monitorKey;

      // Only highlight if this is the selected layout on the selected monitor
      const isSelected = buttonMonitorKey === monitorKey && layout.id === newSelectedLayoutId;
      const bgColor = isSelected ? BUTTON_BG_COLOR_SELECTED : BUTTON_BG_COLOR;

      // Update button's stored selection state
      buttonWithMeta._isSelected = isSelected;

      // Access style property through type assertion
      const currentStyle = buttonWithMeta.style || '';

      if (!currentStyle) {
        log(`[LayoutButtonStyleUpdater] Warning: Button for layout ${layout.label} has no style`);
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
            `[LayoutButtonStyleUpdater] Set layout ${layout.label} (${layout.id}) to SELECTED (blue) on monitor ${monitorKey}`
          );
        }
      }
    }

    log(
      `[LayoutButtonStyleUpdater] Updated ${updatedCount} button(s) out of ${layoutButtons.size} for monitor ${monitorKey}`
    );
  }
}
