import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import { MONITORS_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from '../file/extension-path.js';

const log = (message: string): void => console.log(message);

/**
 * Get monitor count using Gdk (for settings context)
 * Returns 0 if unable to detect
 */
export function getMonitorCountFromGdk(): number {
  try {
    const display = Gdk.Display.get_default();
    if (!display) {
      return 0;
    }

    const monitorList = display.get_monitors();
    if (!monitorList) {
      return 0;
    }

    return monitorList.get_n_items();
  } catch (e) {
    log(`[MonitorDetector] Error getting monitor count from Gdk: ${e}`);
    return 0;
  }
}

/**
 * Load monitor count from monitors.snappa.json
 * Falls back to Gdk detection if file doesn't exist (for settings context)
 */
export function loadMonitorCount(): number {
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (!file.query_exists(null)) {
    const gdkCount = getMonitorCountFromGdk();
    if (gdkCount > 0) {
      log(`[MonitorDetector] No monitor file, using Gdk count: ${gdkCount}`);
      return gdkCount;
    }
    return 0;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      return getMonitorCountFromGdk();
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const data = JSON.parse(contentsString);
    const currentEnv = data.environments.find(
      (e: { id: string; monitors: unknown[] }) => e.id === data.current
    );
    if (currentEnv && Array.isArray(currentEnv.monitors)) {
      return currentEnv.monitors.length;
    }
    return getMonitorCountFromGdk();
  } catch (e) {
    log(`[MonitorDetector] Error loading monitor count: ${e}`);
    return getMonitorCountFromGdk();
  }
}
