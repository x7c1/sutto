import Clutter from 'gi://Clutter';
import type Meta from 'gi://Meta';
import St from 'gi://St';
import { DISPLAY_BG_COLOR, DISPLAY_SPACING, DISPLAY_SPACING_HORIZONTAL } from '../constants.js';
import type { DebugConfig } from '../debug-panel/config.js';
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
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void,
  isLastInRow: boolean = false,
  monitor: Monitor | null = null,
  monitorKey: string,
  layoutHistoryRepository: LayoutHistoryRepository
): MiniatureDisplayView {
  const HEADER_HEIGHT = monitor ? 20 : 0; // Reserve space for header if monitor is provided
  // Apply debug configuration
  const showBackground = !debugConfig || debugConfig.showMiniatureDisplayBackground;
  const showBorder = debugConfig?.showMiniatureDisplayBorder;

  let style = `
        width: ${displayWidth}px;
        height: ${displayHeight + HEADER_HEIGHT}px;
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

  // Add monitor header if monitor information is provided
  if (monitor) {
    const monitorLabel = monitor.isPrimary
      ? `Monitor ${monitor.index + 1} (Primary)`
      : `Monitor ${monitor.index + 1}`;

    const headerLabel = new St.Label({
      text: monitorLabel,
      style: `
        color: rgba(255, 255, 255, 0.8);
        font-size: 9pt;
        font-weight: bold;
        padding: 2px 6px;
      `,
    });
    headerLabel.set_position(6, 2);
    miniatureDisplay.add_child(headerLabel);
  }

  const layoutButtons = new Map<St.Button, Layout>();
  const buttonEvents: MiniatureDisplayView['buttonEvents'] = [];

  // Get selected layout ID for this window using three-tier lookup
  let selectedLayoutId: string | null = null;
  if (window) {
    const windowId = window.get_id();
    const wmClass = window.get_wm_class();
    const title = window.get_title();
    if (wmClass !== null) {
      selectedLayoutId = layoutHistoryRepository.getSelectedLayoutIdForMonitor(
        monitorKey,
        windowId,
        wmClass,
        title
      );
    }
  }

  // Add layout buttons from this group to the miniature display
  for (const layout of group.layouts) {
    // Determine if this layout is selected
    const isSelected = selectedLayoutId !== null && layout.id === selectedLayoutId;

    // Create layout button with per-monitor selection callback
    const wrappedCallback = (selectedLayout: Layout) => {
      onLayoutSelected(selectedLayout, monitorKey);
    };

    const result = createLayoutButton(
      layout,
      displayWidth,
      displayHeight,
      debugConfig,
      isSelected,
      wrappedCallback,
      monitorKey
    );
    layoutButtons.set(result.button, layout);

    // Adjust button position to account for header
    if (HEADER_HEIGHT > 0) {
      const [currentX, currentY] = result.button.get_position();
      result.button.set_position(currentX, currentY + HEADER_HEIGHT);
    }

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
