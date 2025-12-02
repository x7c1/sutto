/// <reference path="../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;

import {
  type DebugConfig,
  getDebugConfig,
  toggleDebugOption,
  toggleTestGroup,
} from './debug-config';
import { DEFAULT_CATEGORIES } from './snap-menu-constants';
import { getTestLayoutGroups } from './test-layouts';

// Constants
const PANEL_WIDTH = 300;
const PANEL_PADDING = 12;
const SECTION_SPACING = 8;
const CHECKBOX_SIZE = 16;
const CHECKBOX_SPACING = 8;

// Colors
const PANEL_BG_COLOR = 'rgba(40, 40, 40, 0.95)';
const PANEL_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
const CHECKBOX_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
const CHECKBOX_BG_COLOR_CHECKED = 'rgba(120, 180, 255, 0.8)';
const CHECKBOX_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
const TEXT_COLOR = 'rgba(255, 255, 255, 0.9)';
const SECTION_HEADER_COLOR = 'rgba(255, 255, 255, 0.7)';

export class DebugPanel {
  private _container: St.BoxLayout | null = null;
  private _checkboxes: Map<string, St.Button> = new Map();
  private _onConfigChanged: (() => void) | null = null;
  private _onEnter: (() => void) | null = null;
  private _onLeave: (() => void) | null = null;
  private _enterEventId: number | null = null;
  private _leaveEventId: number | null = null;

  /**
   * Set callback for when debug configuration changes
   */
  setOnConfigChanged(callback: () => void): void {
    this._onConfigChanged = callback;
  }

  /**
   * Set callback for when cursor enters debug panel
   */
  setOnEnter(callback: () => void): void {
    this._onEnter = callback;
  }

  /**
   * Set callback for when cursor leaves debug panel
   */
  setOnLeave(callback: () => void): void {
    this._onLeave = callback;
  }

  /**
   * Show the debug panel at the specified position
   */
  show(x: number, y: number, height: number): void {
    // Clean up existing panel if any
    this.hide();

    // Create panel container
    this._container = new St.BoxLayout({
      vertical: true,
      reactive: true,
      track_hover: true,
      style: `
                background-color: ${PANEL_BG_COLOR};
                border: 1px solid ${PANEL_BORDER_COLOR};
                border-radius: 8px;
                padding: ${PANEL_PADDING}px;
                width: ${PANEL_WIDTH}px;
                min-height: ${height}px;
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
    this._container.add_child(title);

    // Add category structure section
    this._addCategoryStructureSection();

    // Add sections
    this._addSection('Display Elements', [
      { key: 'showFooter', label: 'Footer' },
      { key: 'showMiniatureDisplayBackground', label: 'Miniature Display Background' },
      { key: 'showMiniatureDisplayBorder', label: 'Miniature Display Border' },
      { key: 'showButtonBorders', label: 'Button Borders' },
    ]);

    this._addSection('Debug Visualizations', [
      { key: 'showSpacingGuides', label: 'Spacing Guides' },
      { key: 'showSizeLabels', label: 'Size Labels' },
    ]);

    this._addTestGroupsSection();

    // Add panel to chrome (similar to SnapMenu)
    Main.layoutManager.addChrome(this._container, {
      affectsInputRegion: true,
      trackFullscreen: false,
    });

    // Position panel
    this._container.set_position(x, y);

    // Setup hover events to notify parent menu
    this._enterEventId = this._container.connect('enter-event', () => {
      if (this._onEnter) {
        this._onEnter();
      }
      return false;
    });

    this._leaveEventId = this._container.connect('leave-event', () => {
      if (this._onLeave) {
        this._onLeave();
      }
      return false;
    });
  }

  /**
   * Hide the debug panel
   */
  hide(): void {
    if (this._container) {
      // Disconnect event handlers
      if (this._enterEventId !== null) {
        this._container.disconnect(this._enterEventId);
        this._enterEventId = null;
      }
      if (this._leaveEventId !== null) {
        this._container.disconnect(this._leaveEventId);
        this._leaveEventId = null;
      }

      Main.layoutManager.removeChrome(this._container);
      this._container.destroy();
      this._container = null;
    }
    this._checkboxes.clear();
  }

  /**
   * Update panel position
   */
  updatePosition(x: number, y: number): void {
    if (this._container) {
      this._container.set_position(x, y);
    }
  }

  private _addSection(
    sectionTitle: string,
    options: Array<{ key: keyof Omit<DebugConfig, 'enabledTestGroups'>; label: string }>
  ): void {
    if (!this._container) return;

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
    this._container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this._container.add_child(separator);

    // Add options
    const config = getDebugConfig();
    for (const option of options) {
      const checked = config[option.key] as boolean;
      const checkbox = this._createCheckbox(option.label, checked, (newChecked) => {
        toggleDebugOption(option.key);
        this._updateCheckboxState(option.key, newChecked);
        if (this._onConfigChanged) {
          this._onConfigChanged();
        }
      });
      this._checkboxes.set(option.key, checkbox);
      this._container.add_child(checkbox);
    }
  }

  private _addCategoryStructureSection(): void {
    if (!this._container) return;

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
    this._container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this._container.add_child(separator);

    // Display total number of categories
    const totalCategories = DEFAULT_CATEGORIES.length;
    const summaryLabel = new St.Label({
      text: `Total Categories: ${totalCategories}`,
      style: `
                color: ${TEXT_COLOR};
                font-size: 9pt;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this._container.add_child(summaryLabel);

    // Display each category with hierarchy
    for (const category of DEFAULT_CATEGORIES) {
      const displayCount = category.layoutGroups.length;
      const totalButtons = category.layoutGroups.reduce(
        (sum, group) => sum + group.layouts.length,
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
      this._container.add_child(categoryLabel);

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
        this._container.add_child(displayLabel);
      }
    }
  }

  private _addTestGroupsSection(): void {
    if (!this._container) return;

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
    this._container.add_child(header);

    // Add separator
    const separator = new St.Widget({
      style: `
                background-color: ${PANEL_BORDER_COLOR};
                height: 1px;
                margin-bottom: ${SECTION_SPACING / 2}px;
            `,
    });
    this._container.add_child(separator);

    // Add test groups
    const config = getDebugConfig();
    const testGroups = getTestLayoutGroups();
    for (const group of testGroups) {
      const checked = config.enabledTestGroups.has(group.name);
      const checkbox = this._createCheckbox(group.name, checked, (newChecked) => {
        toggleTestGroup(group.name);
        this._updateCheckboxState(group.name, newChecked);
        if (this._onConfigChanged) {
          this._onConfigChanged();
        }
      });
      this._checkboxes.set(group.name, checkbox);
      this._container.add_child(checkbox);
    }
  }

  private _createCheckbox(
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

  private _updateCheckboxState(key: string, checked: boolean): void {
    const button = this._checkboxes.get(key);
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
