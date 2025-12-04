/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * SnapMenuDebugIntegration
 *
 * Manages debug panel integration and test layout merging.
 * Handles debug configuration changes and panel lifecycle.
 */

import { getDebugConfig, isDebugMode, loadDebugConfig } from './debug-config';
import { DebugPanel } from './debug-panel';
import { ensureTestLayoutsImported } from './layouts-repository';
import type { SnapMenuAutoHide } from './snap-menu-auto-hide';
import { AUTO_HIDE_DELAY_MS } from './snap-menu-constants';
import { getTestLayoutGroups } from './test-layouts';
import type { LayoutGroupCategory } from './types';

declare function log(message: string): void;

export class SnapMenuDebugIntegration {
  private debugPanel: DebugPanel | null = null;

  /**
   * Initialize debug panel if debug mode is enabled
   */
  initialize(autoHide: SnapMenuAutoHide, onConfigChanged: () => void): void {
    if (isDebugMode()) {
      log('[SnapMenuDebugIntegration] Debug mode is enabled, initializing debug panel');
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
    } else {
      log('[SnapMenuDebugIntegration] Debug mode is disabled');
    }
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
   * Show debug panel relative to menu position
   */
  showRelativeTo(menuX: number, menuY: number, menuWidth: number, menuHeight: number): void {
    if (this.debugPanel) {
      log(
        `[SnapMenuDebugIntegration] Showing debug panel relative to menu at: x=${menuX}, y=${menuY}, width=${menuWidth}, height=${menuHeight}`
      );
      this.debugPanel.showRelativeTo(menuX, menuY, menuWidth, menuHeight);
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

  /**
   * Update debug panel position
   */
  updatePosition(x: number, y: number): void {
    if (this.debugPanel) {
      this.debugPanel.updatePosition(x, y);
    }
  }
}
