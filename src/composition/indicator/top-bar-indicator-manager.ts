/**
 * TopBarIndicatorManager
 *
 * Adds or removes the top bar indicator following the user's preference,
 * applying changes immediately without restarting the Shell.
 */

import Gio from 'gi://Gio';
import type { GSettingsPreferencesRepository } from '../../infra/glib/index.js';
import {
  buildIndicatorMenuModel,
  type IndicatorMenuInput,
  TopBarIndicator,
} from '../../ui/top-bar-indicator/index.js';

declare function log(message: string): void;

export interface TopBarIndicatorManagerOptions {
  /** Unique status area role for the indicator. */
  role: string;
  getMenuInput: () => IndicatorMenuInput;
  onShowPanel: () => void;
  onOpenPreferences: () => void;
}

export class TopBarIndicatorManager {
  private indicator: TopBarIndicator | null = null;
  private stopWatchingPreference: (() => void) | null = null;

  constructor(
    private readonly preferencesRepository: GSettingsPreferencesRepository,
    private readonly options: TopBarIndicatorManagerOptions
  ) {}

  enable(): void {
    this.stopWatchingPreference = this.preferencesRepository.watchTopBarIndicatorShown((shown) =>
      this.setShown(shown)
    );
    this.setShown(this.preferencesRepository.isTopBarIndicatorShown());
  }

  /**
   * Re-render the indicator's menu, e.g. after the license state changed
   */
  refresh(): void {
    this.indicator?.refresh();
  }

  disable(): void {
    this.stopWatchingPreference?.();
    this.stopWatchingPreference = null;
    this.setShown(false);
  }

  private setShown(shown: boolean): void {
    if (shown && !this.indicator) {
      log('[TopBarIndicatorManager] Adding top bar indicator');
      this.indicator = new TopBarIndicator({
        role: this.options.role,
        name: 'Sutto',
        getMenuModel: () => buildIndicatorMenuModel(this.options.getMenuInput()),
        onShowPanel: this.options.onShowPanel,
        onOpenPreferences: this.options.onOpenPreferences,
        onPurchaseLicense: () => this.openPurchasePage(),
      });
    } else if (!shown && this.indicator) {
      log('[TopBarIndicatorManager] Removing top bar indicator');
      this.indicator.destroy();
      this.indicator = null;
    }
  }

  private openPurchasePage(): void {
    try {
      Gio.AppInfo.launch_default_for_uri(
        __LICENSE_PURCHASE_URL__,
        global.create_app_launch_context(0, -1)
      );
    } catch (e) {
      log(`[TopBarIndicatorManager] Failed to open purchase page: ${e}`);
    }
  }
}
