import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { EXTENSION_UUID, MONITORS_FILE_NAME } from '../app/constants.js';
import type { Monitor, SpacesRow } from '../app/types/index.js';

/**
 * Get extension data directory path
 */
function getExtensionDataPath(filename: string): string {
  const dataDir = GLib.get_user_data_dir();
  return GLib.build_filenamev([dataDir, 'gnome-shell', 'extensions', EXTENSION_UUID, filename]);
}

/**
 * Load monitor configuration from file saved by extension
 * Falls back to default horizontal layout if file doesn't exist
 */
export function loadMonitors(rows: SpacesRow[]): Map<string, Monitor> {
  const monitors = new Map<string, Monitor>();
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (file.query_exists(null)) {
    try {
      const [success, contents] = file.load_contents(null);
      if (success) {
        const contentsString = new TextDecoder('utf-8').decode(contents);
        const monitorsArray = JSON.parse(contentsString) as Monitor[];
        for (const monitor of monitorsArray) {
          monitors.set(String(monitor.index), monitor);
        }
        return monitors;
      }
    } catch (e) {
      // Fall through to default
    }
  }

  // Fallback: create default horizontal layout
  const monitorKeys = new Set<string>();
  for (const row of rows) {
    for (const space of row.spaces) {
      for (const key of Object.keys(space.displays)) {
        monitorKeys.add(key);
      }
    }
  }

  const sortedKeys = Array.from(monitorKeys).sort();
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  for (let i = 0; i < sortedKeys.length; i++) {
    const key = sortedKeys[i];
    monitors.set(key, {
      index: parseInt(key, 10),
      geometry: {
        x: i * defaultWidth,
        y: 0,
        width: defaultWidth,
        height: defaultHeight,
      },
      workArea: {
        x: i * defaultWidth,
        y: 0,
        width: defaultWidth,
        height: defaultHeight,
      },
      isPrimary: i === 0,
    });
  }

  return monitors;
}
