import Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import { DISPLAY_BG_COLOR, DISPLAY_SPACING, DISPLAY_SPACING_HORIZONTAL } from '../constants.js';
import type { DebugConfig } from '../debug-panel/config.js';
import { getSelectedLayoutId } from '../repository/layout-history.js';
import type { Layout, LayoutGroup } from '../types/index.js';
import { createLayoutButton } from './layout-button.js';

export interface MiniatureDisplayView {
  miniatureDisplay: St.Widget;
  layoutButtons: Map<St.Button, Layout>;
  buttonEvents: Array<{
    button: St.Button;
    enterEventId: number;
    leaveEventId: number;
    clickEventId: number;
  }>;
}

/**
 * Create a miniature display view with light black background for a specific group
 */
export function createMiniatureDisplayView(
  group: LayoutGroup,
  displayWidth: number,
  displayHeight: number,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout) => void,
  isLastInRow: boolean = false
): MiniatureDisplayView {
  // Apply debug configuration
  const showBackground = !debugConfig || debugConfig.showMiniatureDisplayBackground;
  const showBorder = debugConfig?.showMiniatureDisplayBorder;

  let style = `
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        border-radius: 4px;
        margin-bottom: ${DISPLAY_SPACING}px;
        ${!isLastInRow ? `margin-right: ${DISPLAY_SPACING_HORIZONTAL}px;` : ''}
    `;

  if (showBackground) {
    style += `background-color: ${DISPLAY_BG_COLOR};`;
  }

  if (showBorder) {
    style += `border: 2px solid rgba(255, 0, 0, 0.5);`; // Red border for debugging
  }

  const miniatureDisplay = new St.Widget({
    style_class: 'snap-miniature-display',
    style: style,
    layout_manager: new Clutter.FixedLayout(),
    reactive: true,
  });

  const layoutButtons = new Map<St.Button, Layout>();
  const buttonEvents: MiniatureDisplayView['buttonEvents'] = [];

  // Get selected layout ID for this window using three-tier lookup
  let selectedLayoutId: string | null = null;
  if (window) {
    const windowId = window.get_id();
    const wmClass = window.get_wm_class();
    const title = window.get_title();
    if (wmClass !== null) {
      selectedLayoutId = getSelectedLayoutId(windowId, wmClass, title);
    }
  }

  // Add layout buttons from this group to the miniature display
  for (const layout of group.layouts) {
    // Determine if this layout is selected
    const isSelected = selectedLayoutId !== null && layout.id === selectedLayoutId;

    const result = createLayoutButton(
      layout,
      displayWidth,
      displayHeight,
      debugConfig,
      isSelected,
      onLayoutSelected
    );
    layoutButtons.set(result.button, layout);
    miniatureDisplay.add_child(result.button);
    buttonEvents.push({
      button: result.button,
      enterEventId: result.enterEventId,
      leaveEventId: result.leaveEventId,
      clickEventId: result.clickEventId,
    });
  }

  // Add spacing guide labels if enabled
  if (debugConfig?.showSpacingGuides) {
    // Add group name label at the top
    const groupLabel = new St.Label({
      text: group.name,
      style: `
                color: rgba(0, 200, 255, 0.9);
                font-size: 7pt;
                background-color: rgba(0, 0, 0, 0.8);
                padding: 2px 4px;
                border-radius: 2px;
            `,
    });
    groupLabel.set_position(4, 4);
    miniatureDisplay.add_child(groupLabel);

    // Add spacing info label at the bottom
    const spacingLabel = new St.Label({
      text: `Spacing: ${DISPLAY_SPACING}px`,
      style: `
                color: rgba(255, 255, 0, 0.9);
                font-size: 7pt;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 2px 4px;
                border-radius: 2px;
            `,
    });
    spacingLabel.set_position(4, displayHeight - 20);
    miniatureDisplay.add_child(spacingLabel);
  }

  return { miniatureDisplay, layoutButtons, buttonEvents };
}
