import Gio from 'gi://Gio';
import type { ShellExtensionSettingsPort } from './prune-stale-uuids.js';

/**
 * Production {@link ShellExtensionSettingsPort} implementation backed by
 * the `org.gnome.shell` GSettings schema. Tests substitute an in-memory fake.
 */
export class GioShellExtensionSettings implements ShellExtensionSettingsPort {
  private readonly settings: Gio.Settings;

  constructor() {
    this.settings = Gio.Settings.new('org.gnome.shell');
  }

  getEnabledExtensions(): string[] {
    return this.settings.get_strv('enabled-extensions');
  }

  setEnabledExtensions(uuids: string[]): void {
    this.settings.set_strv('enabled-extensions', uuids);
  }

  getDisabledExtensions(): string[] {
    return this.settings.get_strv('disabled-extensions');
  }

  setDisabledExtensions(uuids: string[]): void {
    this.settings.set_strv('disabled-extensions', uuids);
  }
}
