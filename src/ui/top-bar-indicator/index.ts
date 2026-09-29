/**
 * Top Bar Indicator
 *
 * A top bar icon whose popup menu shows the main panel, opens the
 * preferences, and shows the license status with a purchase link.
 */

import GLib from 'gi://GLib';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import type { IndicatorMenuModel } from './menu-model.js';

export type { IndicatorMenuInput, IndicatorMenuModel } from './menu-model.js';
export { buildIndicatorMenuModel } from './menu-model.js';

declare function log(message: string): void;

const ICON_NAME = 'view-grid-symbolic';

export interface TopBarIndicatorOptions {
  /** Unique status area role, e.g. the extension UUID. */
  role: string;
  /** Accessible name of the indicator button. */
  name: string;
  getMenuModel: () => IndicatorMenuModel;
  onShowPanel: () => void;
  onOpenPreferences: () => void;
  onPurchaseLicense: () => void;
}

export class TopBarIndicator {
  private readonly button: PanelMenu.Button;
  private readonly showPanelItem: PopupMenu.PopupMenuItem;
  private readonly licenseStatusItem: PopupMenu.PopupMenuItem;
  private readonly purchaseItem: PopupMenu.PopupMenuItem;
  private pendingActionId: number | null = null;

  constructor(private readonly options: TopBarIndicatorOptions) {
    this.button = new PanelMenu.Button(0.0, options.name, false);
    this.button.add_child(new St.Icon({ icon_name: ICON_NAME, style_class: 'system-status-icon' }));

    const menu = this.button.menu as PopupMenu.PopupMenu;

    this.showPanelItem = this.addActionItem(menu, 'Show Panel', options.onShowPanel);
    this.addActionItem(menu, 'Preferences…', options.onOpenPreferences);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.licenseStatusItem = new PopupMenu.PopupMenuItem('', {
      reactive: false,
      can_focus: false,
    });
    menu.addMenuItem(this.licenseStatusItem);
    this.purchaseItem = this.addActionItem(menu, 'Purchase License…', options.onPurchaseLicense);

    // Focus and panel visibility are not observable here, so re-evaluate the
    // menu every time it opens.
    menu.connect('open-state-changed', (_menu, isOpen) => {
      if (isOpen) {
        this.refresh();
      }
      return undefined;
    });

    this.refresh();
    Main.panel.addToStatusArea(options.role, this.button);
  }

  /**
   * Re-render the menu items from the current model
   */
  refresh(): void {
    const model = this.options.getMenuModel();
    this.showPanelItem.setSensitive(model.showPanelSensitive);
    this.licenseStatusItem.label.set_text(`${model.licenseTitle} — ${model.licenseSubtitle}`);
    this.purchaseItem.visible = model.showPurchaseItem;
  }

  destroy(): void {
    if (this.pendingActionId !== null) {
      GLib.source_remove(this.pendingActionId);
      this.pendingActionId = null;
    }
    // Destroying the button also destroys its menu and removes it from the
    // panel's status area.
    this.button.destroy();
  }

  private addActionItem(
    menu: PopupMenu.PopupMenu,
    label: string,
    action: () => void
  ): PopupMenu.PopupMenuItem {
    const item = new PopupMenu.PopupMenuItem(label);
    item.connect('activate', () => this.runAfterMenuCloses(label, action));
    menu.addMenuItem(item);
    return item;
  }

  /**
   * Run a menu action once the menu has closed, so the menu's modal grab has
   * been released and cannot take key focus back from what the action opens.
   */
  private runAfterMenuCloses(label: string, action: () => void): void {
    if (this.pendingActionId !== null) {
      GLib.source_remove(this.pendingActionId);
    }
    this.pendingActionId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      this.pendingActionId = null;
      try {
        action();
      } catch (e) {
        log(`[TopBarIndicator] "${label}" failed: ${e}`);
      }
      return GLib.SOURCE_REMOVE;
    });
  }
}
