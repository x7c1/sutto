import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { DEFAULT_LAYOUT_SETTINGS, PANEL_EDGE_PADDING } from '../constants.js';
import { adjustDebugPanelPosition } from '../positioning/index.js';
import type { Position, Size } from '../types/index.js';
import { type DebugConfig, getDebugConfig, toggleDebugOption, toggleTestGroup } from './config.js';
import { getTestLayoutGroups } from './test-layouts.js';

declare function log(message: string): void;

// Constants
const PANEL_WIDTH = 300;
const PANEL_PADDING = 12;
const SECTION_SPACING = 8;
const CHECKBOX_SIZE = 16;
const CHECKBOX_SPACING = 8;
const DEBUG_PANEL_GAP = 20; // Gap between main panel and debug panel

// Colors
const PANEL_BG_COLOR = 'rgba(40, 40, 40, 0.95)';
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
const CHECKBOX_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
const CHECKBOX_BG_COLOR_CHECKED = 'rgba(120, 180, 255, 0.8)';
const CHECKBOX_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
const TEXT_COLOR = 'rgba(255, 255, 255, 0.9)';
const SECTION_HEADER_COLOR = 'rgba(255, 255, 255, 0.7)';

export class DebugPanel {
  private container: St.BoxLayout | null = null;
  private checkboxes: Map<string, St.Button> = new Map();
  private onConfigChanged: (() => void) | null = null;
  private onEnter: (() => void) | null = null;
  private onLeave: (() => void) | null = null;
  private enterEventId: number | null = null;
  private leaveEventId: number | null = null;
  private panelHeight: number = 0; // Store panel height for boundary checking

  /**
   * Set callback for when debug configuration changes
   */
  setOnConfigChanged(callback: () => void): void {
    this.onConfigChanged = callback;
  }

  /**
   * Set callback for when cursor enters debug panel
   */
  setOnEnter(callback: () => void): void {
    this.onEnter = callback;
  }

  /**
   * Set callback for when cursor leaves debug panel
   */
  setOnLeave(callback: () => void): void {
    this.onLeave = callback;
  }

  /**
   * Show debug panel relative to the main panel position
   * Calculates its own position based on main panel bounds
   */
  showRelativeTo(mainPanelPosition: Position, mainPanelSize: Size): void {
    // Clean up existing panel if any
    this.hide();

    // Create panel container
    this.container = new St.BoxLayout({
      vertical: true,
      reactive: true,
      track_hover: true,
      style: `
                background-color: ${PANEL_BG_COLOR};
                border: 1px solid ${PANEL_BORDER_COLOR};
                border-radius: 8px;
                padding: ${PANEL_PADDING}px;
                width: ${PANEL_WIDTH}px;
                min-height: ${mainPanelSize.height}px;
            `,
    });

    // Add panel title
    const title = new St.Label({
      text: 'Debug Panel',
      style: `
                color: ${TEXT_COLOR};
                font-size: 14pt;
                font-weight: bold;
                margin-bottom: ${SECTION_SPACING}px;
            `,
    });
    this.container.add_child(title);

    // Add category structure section
    this.addCategoryStructureSection();

    // Add sections
    this.addSection('Display Elements', [
      { key: 'showFooter', label: 'Footer' },
      { key: 'showMiniatureDisplayBackground', label: 'Miniature Display Background' },
      { key: 'showMiniatureDisplayBorder', label: 'Miniature Display Border' },
      { key: 'showButtonBorders', label: 'Button Borders' },
    ]);

    this.addSection('Debug Visualizations', [
      { key: 'showSpacingGuides', label: 'Spacing Guides' },
      { key: 'showSizeLabels', label: 'Size Labels' },
    ]);

    this.addTestGroupsSection();

    // Add panel to chrome (similar to MainPanel)
    Main.layoutManager.addChrome(this.container, {
      affectsInputRegion: true,
      trackFullscreen: false,
    });

    // Calculate debug panel position: to the right of main panel with gap
    const debugPanelX = mainPanelPosition.x + mainPanelSize.width + DEBUG_PANEL_GAP;

    // Position panel temporarily at calculated position to allow size calculation
    this.container.set_position(debugPanelX, mainPanelPosition.y);

    // Get preferred height to calculate actual panel size
    // Use PANEL_WIDTH as the for_width parameter since panel has fixed width
    const [, naturalHeight] = (this.container as any).get_preferred_height(PANEL_WIDTH);
    this.panelHeight = naturalHeight > 0 ? naturalHeight : mainPanelSize.height;
    log(
      `[DebugPanel] Main panel position: (${mainPanelPosition.x}, ${mainPanelPosition.y}), Main panel width: ${mainPanelSize.width}, Debug panel X: ${debugPanelX}, Natural height: ${naturalHeight}, Using height: ${this.panelHeight}, Min height: ${mainPanelSize.height}`
    );

    // Adjust and set final position using updatePosition
    this.updatePosition({ x: debugPanelX, y: mainPanelPosition.y });

    // Setup hover events to notify parent main panel
    this.enterEventId = this.container.connect('enter-event', () => {
      if (this.onEnter) {
        this.onEnter();
      }
      return false;
    });

    this.leaveEventId = this.container.connect('leave-event', () => {
      if (this.onLeave) {
        this.onLeave();
      }
      return false;
    });
  }

  /**
   * Hide the debug panel
   */
  hide(): void {
    if (this.container) {
      // Disconnect event handlers
      if (this.enterEventId !== null) {
        this.container.disconnect(this.enterEventId);
        this.enterEventId = null;
      }
      if (this.leaveEventId !== null) {
        this.container.disconnect(this.leaveEventId);
        this.leaveEventId = null;
      }

      Main.layoutManager.removeChrome(this.container);
      this.container.destroy();
      this.container = null;
    }
    this.checkboxes.clear();
    this.panelHeight = 0; // Reset panel height
  }

  /**
   * Update panel position
   */
  updatePosition(position: Position): void {
    if (this.container && this.panelHeight > 0) {
      // Adjust Y position to keep panel within screen boundaries
      const screenWidth = global.screen_width;
      const screenHeight = global.screen_height;
      const adjusted = adjustDebugPanelPosition(
        position,
        { width: PANEL_WIDTH, height: this.panelHeight },
        {
          screenWidth,
          screenHeight,
          edgePadding: PANEL_EDGE_PADDING,
        },
        { adjustYOnly: true }
      );
      log(
        `[DebugPanel] Update position: Y ${position.y} -> ${adjusted.y} (height: ${this.panelHeight})`
      );
      this.container.set_position(position.x, adjusted.y);
    }
  }

  private addSection(
    sectionTitle: string,
    options: Array<{ key: keyof Omit<DebugConfig, 'enabledTestGroups'>; label: string }>
  ): void {
    if (!this.container) return;

    // Section header
    const header = new St.Label({
      text: sectionTitle,
      style: `
                color: ${SECTION_HEADER_COLOR};
                font-size: 10pt;
                font-weight: bold;
                margin-top: ${SECTION_SPACING}px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(separator);

    // Add options
    const config = getDebugConfig();
    for (const option of options) {
      const checked = config[option.key] as boolean;
      const checkbox = this.createCheckbox(option.label, checked, (newChecked) => {
        toggleDebugOption(option.key);
        this.updateCheckboxState(option.key, newChecked);
        if (this.onConfigChanged) {
          this.onConfigChanged();
        }
      });
      this.checkboxes.set(option.key, checkbox);
      this.container.add_child(checkbox);
    }
  }

  private addCategoryStructureSection(): void {
    if (!this.container) return;

    // Section header
    const header = new St.Label({
      text: 'Category Structure',
      style: `
                color: ${SECTION_HEADER_COLOR};
                font-size: 10pt;
                font-weight: bold;
                margin-top: ${SECTION_SPACING}px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(separator);

    // Display total number of categories
    const totalCategories = DEFAULT_LAYOUT_SETTINGS.length;
    const summaryLabel = new St.Label({
      text: `Total Categories: ${totalCategories}`,
      style: `
                color: ${TEXT_COLOR};
                font-size: 9pt;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(summaryLabel);

    // Display each category with hierarchy
    for (const category of DEFAULT_LAYOUT_SETTINGS) {
      const displayCount = category.layoutGroups.length;
      const totalButtons = category.layoutGroups.reduce(
        (sum: number, group) => sum + group.layouts.length,
        0
      );

      // Category name and display count
      const categoryLabel = new St.Label({
        text: `├─ ${category.name} (${displayCount} displays, ${totalButtons} buttons)`,
        style: `
                    color: rgba(120, 180, 255, 0.9);
                    font-size: 8pt;
                    margin-left: ${SECTION_SPACING}px;
                    margin-top: ${SECTION_SPACING / 4}px;
                `,
      });
      this.container.add_child(categoryLabel);

      // Display each layout group (display)
      for (let i = 0; i < category.layoutGroups.length; i++) {
        const group = category.layoutGroups[i];
        const isLastDisplay = i === category.layoutGroups.length - 1;
        const displayPrefix = isLastDisplay ? '  └─' : '  ├─';

        const displayLabel = new St.Label({
          text: `${displayPrefix} ${group.name} (${group.layouts.length} buttons)`,
          style: `
                        color: rgba(180, 220, 180, 0.8);
                        font-size: 7pt;
                        margin-left: ${SECTION_SPACING * 2}px;
                    `,
        });
        this.container.add_child(displayLabel);
      }
    }
  }

  private addTestGroupsSection(): void {
    if (!this.container) return;

    // Section header
    const header = new St.Label({
      text: 'Test Layout Groups',
      style: `
                color: ${SECTION_HEADER_COLOR};
                font-size: 10pt;
                font-weight: bold;
                margin-top: ${SECTION_SPACING}px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this.container.add_child(separator);

    // Add test groups
    const config = getDebugConfig();
    const testGroups = getTestLayoutGroups();
    for (const group of testGroups) {
      const checked = config.enabledTestGroups.has(group.name);
      const checkbox = this.createCheckbox(group.name, checked, (newChecked) => {
        toggleTestGroup(group.name);
        this.updateCheckboxState(group.name, newChecked);
        if (this.onConfigChanged) {
          this.onConfigChanged();
        }
      });
      this.checkboxes.set(group.name, checkbox);
      this.container.add_child(checkbox);
    }
  }

  private createCheckbox(
    label: string,
    checked: boolean,
    onToggle: (checked: boolean) => void
  ): St.Button {
    // Create checkbox container
    const button = new St.Button({
      style_class: 'debug-panel-checkbox',
      x_expand: true,
      style: `
                padding: ${CHECKBOX_SPACING / 2}px;
                margin-bottom: ${CHECKBOX_SPACING / 2}px;
            `,
    });

    // Create horizontal layout
    const box = new St.BoxLayout({
      vertical: false,
      style: 'spacing: 8px;',
    });

    // Create checkbox indicator
    const checkboxIndicator = new St.Widget({
      style_class: 'checkbox-indicator',
      style: `
                width: ${CHECKBOX_SIZE}px;
                height: ${CHECKBOX_SIZE}px;
                border: 1px solid ${CHECKBOX_BORDER_COLOR};
                border-radius: 2px;
                background-color: ${checked ? CHECKBOX_BG_COLOR_CHECKED : CHECKBOX_BG_COLOR};
            `,
    });

    // Create label
    const labelWidget = new St.Label({
      text: label,
      style: `
                color: ${TEXT_COLOR};
                font-size: 9pt;
            `,
      y_align: Clutter.ActorAlign.CENTER,
    });

    box.add_child(checkboxIndicator);
    box.add_child(labelWidget);
    button.set_child(box);

    // Store initial checked state
    (button as any)._checked = checked;

    // Store reference to checkbox indicator
    (button as any)._checkboxIndicator = checkboxIndicator;

    // Connect click event
    button.connect('clicked', () => {
      const currentChecked = (button as any)._checked as boolean;
      const newChecked = !currentChecked;
      (button as any)._checked = newChecked;

      // Update visual state
      checkboxIndicator.set_style(`
                width: ${CHECKBOX_SIZE}px;
                height: ${CHECKBOX_SIZE}px;
                border: 1px solid ${CHECKBOX_BORDER_COLOR};
                border-radius: 2px;
                background-color: ${newChecked ? CHECKBOX_BG_COLOR_CHECKED : CHECKBOX_BG_COLOR};
            `);

      // Call toggle callback
      onToggle(newChecked);
      return true;
    });

    // Add hover effect
    button.connect('enter-event', () => {
      button.set_style(`
                padding: ${CHECKBOX_SPACING / 2}px;
                margin-bottom: ${CHECKBOX_SPACING / 2}px;
                background-color: rgba(255, 255, 255, 0.1);
            `);
      return false;
    });
    button.connect('leave-event', () => {
      button.set_style(`
                padding: ${CHECKBOX_SPACING / 2}px;
                margin-bottom: ${CHECKBOX_SPACING / 2}px;
            `);
      return false;
    });

    return button;
  }

  private updateCheckboxState(key: string, checked: boolean): void {
    const button = this.checkboxes.get(key);
    if (!button) return;

    (button as any)._checked = checked;

    // Update checkbox indicator using stored reference
    const indicator = (button as any)._checkboxIndicator as St.Widget;
    if (!indicator) return;

    indicator.set_style(`
            width: ${CHECKBOX_SIZE}px;
            height: ${CHECKBOX_SIZE}px;
            border: 1px solid ${CHECKBOX_BORDER_COLOR};
            border-radius: 2px;
            background-color: ${checked ? CHECKBOX_BG_COLOR_CHECKED : CHECKBOX_BG_COLOR};
        `);
  }
}
