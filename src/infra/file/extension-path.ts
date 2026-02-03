import GLib from 'gi://GLib';

import { EXTENSION_UUID } from '../constants.js';

/**
 * Get the extension's data directory path
 * Returns: ~/.local/share/gnome-shell/extensions/{$EXTENSION_UUID}/
 */
export function getExtensionDataDir(): string {
  const dataDir = GLib.get_user_data_dir();
  return GLib.build_filenamev([dataDir, 'gnome-shell', 'extensions', EXTENSION_UUID]);
}

/**
 * Get a file path within the extension's data directory
 * @param filename - Name of the file (e.g., 'debug-config.json')
 * @returns Full path to the file
 */
export function getExtensionDataPath(filename: string): string {
  return GLib.build_filenamev([getExtensionDataDir(), filename]);
}
