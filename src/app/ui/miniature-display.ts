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
  monitorMargin: number = 0
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
      wrappedCallback
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

  // Add monitor label at bottom left (number only)
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
  headerLabel.set_position(6, displayHeight - labelHeight - 6);
  miniatureDisplay.add_child(headerLabel);

  return { miniatureDisplay, layoutButtons, buttonEvents };
}

/**
 * Create error view for missing/disconnected monitor
 *
 */
export function createMiniatureDisplayErrorView(
  monitorKey: string,
  displayWidth: number,
  displayHeight: number
): St.Widget {
  const errorView = new St.Widget({
    style: `
      width: ${displayWidth}px;
      height: ${displayHeight}px;
      background-color: rgba(60, 20, 20, 0.8);
      border: 2px dashed rgba(255, 100, 100, 0.5);
      border-radius: 4px;
      margin-bottom: ${DISPLAY_SPACING}px;
    `,
    layout_manager: new Clutter.FixedLayout(),
  });

  const errorLabel = new St.Label({
    text: `⚠️ Not Connected\nMonitor ${parseInt(monitorKey, 10) + 1}`,
    style: `
      color: rgba(255, 150, 150, 0.9);
      font-size: 10pt;
      text-align: center;
    `,
  });

  // Center the label
  errorLabel.set_position(displayWidth / 2 - 60, displayHeight / 2 - 20);
  errorView.add_child(errorLabel);

  return errorView;
}
