import Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import { DISPLAY_BG_COLOR, DISPLAY_SPACING, DISPLAY_SPACING_HORIZONTAL } from '../constants.js';
import type { LayoutHistoryRepository } from '../repository/layout-history.js';
import type { Layout, LayoutGroup, Monitor } from '../types/index.js';
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
 *
 */
export function createMiniatureDisplayView(
  group: LayoutGroup,
  displayWidth: number,
  displayHeight: number,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout) => void,
  monitor: Monitor,
  layoutHistoryRepository: LayoutHistoryRepository,
  isLastInRow: boolean = false,
  monitorMargin: number = 0,
  totalMonitors: number = 1
): MiniatureDisplayView {
  const style = `
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        border-radius: 4px;
        margin-bottom: ${DISPLAY_SPACING}px;
        ${!isLastInRow ? `margin-right: ${DISPLAY_SPACING_HORIZONTAL}px;` : ''}
        ${monitorMargin > 0 ? `margin: ${monitorMargin}px;` : ''}
        background-color: ${DISPLAY_BG_COLOR};
    `;

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
      selectedLayoutId = layoutHistoryRepository.getSelectedLayoutId(windowId, wmClass, title);
    }
  }

  // Add layout buttons from this group to the miniature display
  for (const layout of group.layouts) {
    // Determine if this layout is selected
    const isSelected = selectedLayoutId !== null && layout.id === selectedLayoutId;

    // Create layout button with selection callback
    const wrappedCallback = (selectedLayout: Layout) => {
      onLayoutSelected(selectedLayout);
    };

    // Create button using full display size
    const result = createLayoutButton(
      layout,
      displayWidth,
      displayHeight,
      isSelected,
      wrappedCallback,
      monitor.index
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

  // Add monitor visual indicators (as overlay)
  // Add menu bar for primary monitor (Ubuntu Displays style)
  if (monitor.isPrimary) {
    const menuBar = new St.Widget({
      style: `
        width: ${displayWidth}px;
        height: 4px;
        background-color: rgba(200, 200, 200, 0.9);
      `,
    });
    menuBar.set_position(0, 0);
    miniatureDisplay.add_child(menuBar);
  }

  // Add monitor label at bottom left (number only) when there are multiple monitors
  if (totalMonitors > 1) {
    const monitorLabel = `${monitor.index + 1}`;

    const headerLabel = new St.Label({
      text: monitorLabel,
      style: `
        color: rgba(255, 255, 255, 0.9);
        font-size: 11pt;
        font-weight: bold;
        padding: 2px 6px;
        background-color: rgba(0, 0, 0, 0.6);
        border-radius: 3px;
      `,
    });

    // Position at bottom left
    // Estimated label height: ~20px (9pt font + padding)
    const labelHeight = 20;
    const margin = 3;
    headerLabel.set_position(margin, displayHeight - labelHeight - margin);
    miniatureDisplay.add_child(headerLabel);
  }

  return { miniatureDisplay, layoutButtons, buttonEvents };
}
