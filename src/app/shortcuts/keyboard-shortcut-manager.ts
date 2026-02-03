/**
 * KeyboardShortcutManager
 *
 * Manages keyboard shortcut registration and unregistration.
 * Handles both show and hide panel shortcuts.
 */

import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import type { ExtensionSettings } from '../../prefs/extension-settings.js';

declare function log(message: string): void;

export class KeyboardShortcutManager {
  private hideShortcutRegistered: boolean = false;

  constructor(private readonly settings: ExtensionSettings) {}

  /**
   * Register show panel keyboard shortcut
   */
  registerShowPanelShortcut(onShowPanel: () => void): void {
    if (!this.settings) {
      log('[KeyboardShortcutManager] Settings not available');
      return;
    }

    try {
      const shortcuts = this.settings.getShowPanelShortcut();
      log(`[KeyboardShortcutManager] Registering show shortcut: ${JSON.stringify(shortcuts)}`);

      Main.wm.addKeybinding(
        'show-panel-shortcut',
        this.settings.getGSettings(),
        Meta.KeyBindingFlags.NONE,
        Shell.ActionMode.NORMAL,
        onShowPanel
      );
      log('[KeyboardShortcutManager] Show panel keyboard shortcut registered successfully');
    } catch (e) {
      log(`[KeyboardShortcutManager] Failed to register show panel shortcut: ${e}`);
    }
  }

  /**
   * Register hide panel keyboard shortcut (called when panel is shown)
   */
  registerHidePanelShortcut(onHidePanel: () => void): void {
    if (!this.settings) return;
    if (this.hideShortcutRegistered) return; // Already registered

    const hideShortcuts = this.settings.getHidePanelShortcut();
    log(`[KeyboardShortcutManager] Registering hide shortcut: ${JSON.stringify(hideShortcuts)}`);

    Main.wm.addKeybinding(
      'hide-panel-shortcut',
      this.settings.getGSettings(),
      Meta.KeyBindingFlags.NONE,
      Shell.ActionMode.NORMAL,
      onHidePanel
    );
    this.hideShortcutRegistered = true;
    log('[KeyboardShortcutManager] Hide panel keyboard shortcut registered successfully');
  }

  /**
   * Unregister hide panel keyboard shortcut (called when panel is hidden)
   */
  unregisterHidePanelShortcut(): void {
    if (!this.settings) return;
    if (!this.hideShortcutRegistered) return; // Not registered

    try {
      Main.wm.removeKeybinding('hide-panel-shortcut');
      this.hideShortcutRegistered = false;
      log('[KeyboardShortcutManager] Hide panel keyboard shortcut unregistered');
    } catch (e) {
      log(`[KeyboardShortcutManager] Failed to unregister hide panel shortcut: ${e}`);
    }
  }

  /**
   * Unregister all keyboard shortcuts
   */
  unregisterAll(): void {
    if (!this.settings) return;

    try {
      Main.wm.removeKeybinding('show-panel-shortcut');
      this.unregisterHidePanelShortcut();
      log('[KeyboardShortcutManager] All keyboard shortcuts unregistered');
    } catch (e) {
      log(`[KeyboardShortcutManager] Failed to unregister shortcuts: ${e}`);
    }
  }
}
