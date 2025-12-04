const GLib = imports.gi.GLib;

/**
 * Get the extension's data directory path
 * Returns: ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/
 */
export function getExtensionDataDir(): string {
  const dataDir = GLib.get_user_data_dir();
  return GLib.build_filenamev([dataDir, 'gnome-shell', 'extensions', 'snappa@x7c1.github.io']);
}

/**
 * Get a file path within the extension's data directory
 * @param filename - Name of the file (e.g., 'debug-config.json')
 * @returns Full path to the file
 */
export function getExtensionDataPath(filename: string): string {
  return GLib.build_filenamev([getExtensionDataDir(), filename]);
}
