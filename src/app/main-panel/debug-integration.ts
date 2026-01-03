/**
 * MainPanelDebugIntegration
 *
 * Manages debug panel integration and test layout merging.
 * Handles debug configuration changes and panel lifecycle.
 */

import type { ExtensionSettings } from '../../settings/extension-settings.js';
import { AUTO_HIDE_DELAY_MS } from '../constants.js';
import { getDebugConfig, isDebugMode, loadDebugConfig } from '../debug-panel/config.js';
import { DebugPanel } from '../debug-panel/index.js';
import { getTestLayoutGroups } from '../debug-panel/test-layouts.js';
import { ensureTestLayoutsImported } from '../repository/layouts.js';
import type { LayoutGroupCategory, Position, Size } from '../types/index.js';
import type { MainPanelAutoHide } from './auto-hide.js';

declare function log(message: string): void;

export class MainPanelDebugIntegration {
  private debugPanel: DebugPanel | null = null;
  private extensionSettings: ExtensionSettings | null = null;

  /**
   * Initialize debug panel integration
   */
  initialize(
    autoHide: MainPanelAutoHide,
    onConfigChanged: () => void,
    extensionSettings: ExtensionSettings
  ): void {
    if (!isDebugMode()) {
      log('[MainPanelDebugIntegration] Debug mode is disabled');
      return;
    }

    log('[MainPanelDebugIntegration] Initializing debug panel integration');
    this.extensionSettings = extensionSettings;

    loadDebugConfig();
    this.debugPanel = new DebugPanel();

    // Setup debug panel callbacks
    this.debugPanel.setOnConfigChanged(() => {
      onConfigChanged();
    });

    this.debugPanel.setOnEnter(() => {
      autoHide.setDebugPanelHovered(true, AUTO_HIDE_DELAY_MS);
    });

    this.debugPanel.setOnLeave(() => {
      autoHide.setDebugPanelHovered(false, AUTO_HIDE_DELAY_MS);
    });
  }

  /**
   * Check if debug panel is enabled
   */
  isEnabled(): boolean {
    return this.debugPanel !== null;
  }

  /**
   * Get the debug panel instance
   */
  getDebugPanel(): DebugPanel | null {
    return this.debugPanel;
  }

  /**
   * Merge test layouts into categories if debug mode is enabled
   * Test layouts are saved to repository for stable IDs (needed for layout history)
   */
  mergeTestCategories(baseCategories: LayoutGroupCategory[]): LayoutGroupCategory[] {
    if (!this.debugPanel) {
      return baseCategories;
    }

    const debugConfig = getDebugConfig();
    if (!debugConfig) {
      return baseCategories;
    }

    const testGroupSettings = getTestLayoutGroups();
    const enabledTestGroupSettings = testGroupSettings.filter((g) =>
      debugConfig.enabledTestGroups.has(g.name)
    );

    // Import test layouts to repository and get the category with stable IDs
    if (enabledTestGroupSettings.length > 0) {
      const testCategory = ensureTestLayoutsImported(enabledTestGroupSettings);
      if (testCategory) {
        // Filter to only enabled groups
        const enabledGroupNames = new Set(enabledTestGroupSettings.map((g) => g.name));
        const filteredTestCategory: LayoutGroupCategory = {
          name: testCategory.name,
          layoutGroups: testCategory.layoutGroups.filter((g) => enabledGroupNames.has(g.name)),
        };
        return [...baseCategories, filteredTestCategory];
      }
    }

    return baseCategories;
  }

  /**
   * Show debug panel relative to main panel position
   */
  showRelativeTo(position: Position, size: Size): void {
    if (!this.debugPanel || !this.extensionSettings) {
      return;
    }

    // Check setting value each time main panel is shown
    const debugPanelEnabled = this.extensionSettings.getDebugPanelEnabled();
    log(`[MainPanelDebugIntegration] Debug panel enabled: ${debugPanelEnabled}`);

    if (debugPanelEnabled) {
      log(
        `[MainPanelDebugIntegration] Showing debug panel relative to main panel at: x=${position.x}, y=${position.y}, width=${size.width}, height=${size.height}`
      );
      this.debugPanel.showRelativeTo(position, size);
    }
  }

  /**
   * Hide debug panel
   */
  hide(): void {
    if (this.debugPanel) {
      this.debugPanel.hide();
    }
  }
}
