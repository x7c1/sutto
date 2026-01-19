import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { EXTENSION_UUID, MONITORS_FILE_NAME } from '../app/constants.js';
import type {
  Monitor,
  MonitorEnvironment,
  MonitorEnvironmentStorage,
  SpacesRow,
} from '../app/types/index.js';

/**
 * Get extension data directory path
 */
function getExtensionDataPath(filename: string): string {
  const dataDir = GLib.get_user_data_dir();
  return GLib.build_filenamev([dataDir, 'gnome-shell', 'extensions', EXTENSION_UUID, filename]);
}

/**
 * Load the monitor environment storage from file
 */
export function loadMonitorStorage(): MonitorEnvironmentStorage | null {
  const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
  const file = Gio.File.new_for_path(filePath);

  if (!file.query_exists(null)) {
    return null;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (success) {
      const json = new TextDecoder('utf-8').decode(contents);
      const parsed = JSON.parse(json);

      // Check if this is new multi-environment format
      if (parsed.environments && Array.isArray(parsed.environments)) {
        return parsed as MonitorEnvironmentStorage;
      }
    }
  } catch (e) {
    console.log(`[Snappa Prefs] Error loading monitor storage: ${e}`);
  }

  return null;
}

/**
 * Find the best matching environment for displaying a collection
 * Priority: 1) Match monitor count (displayCount), 2) Most recent lastActiveAt
 */
export function findEnvironmentForDisplayCount(
  storage: MonitorEnvironmentStorage | null,
  displayCount: number
): MonitorEnvironment | null {
  if (!storage || storage.environments.length === 0) {
    return null;
  }

  // Filter environments with matching monitor count
  const matching = storage.environments.filter((e) => e.monitors.length === displayCount);

  if (matching.length > 0) {
    // Return most recent matching environment
    return matching.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
  }

  return null;
}

/**
 * Convert a MonitorEnvironment's monitors to a Map for use in rendering
 */
export function environmentToMonitorMap(environment: MonitorEnvironment): Map<string, Monitor> {
  const monitors = new Map<string, Monitor>();
  for (const monitor of environment.monitors) {
    monitors.set(String(monitor.index), monitor);
  }
  return monitors;
}

/**
 * Get the current environment's monitors as a Map
 */
export function getCurrentMonitors(
  storage: MonitorEnvironmentStorage | null
): Map<string, Monitor> {
  if (!storage || !storage.current) {
    return new Map();
  }

  const currentEnv = storage.environments.find((e) => e.id === storage.current);
  if (currentEnv) {
    return environmentToMonitorMap(currentEnv);
  }

  return new Map();
}

/**
 * Load monitor configuration from file saved by extension
 * Falls back to Gdk detection or default horizontal layout if file doesn't exist
 * @deprecated Use loadMonitorStorage() and getCurrentMonitors() for new code
 */
export function loadMonitors(rows: SpacesRow[]): Map<string, Monitor> {
  const storage = loadMonitorStorage();

  // Try to get current environment monitors
  if (storage) {
    const currentMonitors = getCurrentMonitors(storage);
    if (currentMonitors.size > 0) {
      return currentMonitors;
    }
  }

  // Fallback 1: Try Gdk detection (works in settings context)
  const gdkMonitors = getMonitorsFromGdk();
  if (gdkMonitors.size > 0) {
    console.log(`[Snappa Prefs] Using Gdk monitors: ${gdkMonitors.size}`);
    return gdkMonitors;
  }

  // Fallback 2: create default horizontal layout based on rows
  const monitors = new Map<string, Monitor>();
  const monitorKeys = new Set<string>();
  for (const row of rows) {
    for (const space of row.spaces) {
      for (const key of Object.keys(space.displays)) {
        monitorKeys.add(key);
      }
    }
  }

  // If no monitor keys from rows, create at least 1 default monitor
  if (monitorKeys.size === 0) {
    console.log('[Snappa Prefs] No monitor info available, creating 1 default monitor');
    monitors.set('0', {
      index: 0,
      geometry: { x: 0, y: 0, width: 1920, height: 1080 },
      workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      isPrimary: true,
    });
    return monitors;
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

/**
 * Create a default monitor map for a given display count
 * Used when no matching environment exists
 */
export function createDefaultMonitors(displayCount: number): Map<string, Monitor> {
  const monitors = new Map<string, Monitor>();
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  for (let i = 0; i < displayCount; i++) {
    monitors.set(String(i), {
      index: i,
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

/**
 * Get monitors using Gdk (for settings context when no storage file exists)
 * Creates monitor map based on actual screen configuration
 */
export function getMonitorsFromGdk(): Map<string, Monitor> {
  const monitors = new Map<string, Monitor>();

  try {
    const display = Gdk.Display.get_default();
    if (!display) {
      return monitors;
    }

    const monitorList = display.get_monitors();
    if (!monitorList) {
      return monitors;
    }

    const count = monitorList.get_n_items();
    for (let i = 0; i < count; i++) {
      const gdkMonitor = monitorList.get_item(i) as Gdk.Monitor | null;
      if (!gdkMonitor) continue;

      const geometry = gdkMonitor.get_geometry();
      monitors.set(String(i), {
        index: i,
        geometry: {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        workArea: {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        isPrimary: i === 0,
      });
    }
  } catch (e) {
    console.log(`[Snappa Prefs] Error getting monitors from Gdk: ${e}`);
  }

  return monitors;
}
