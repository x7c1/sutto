/**
 * Monitor Manager
 *
 * Manages monitor detection and multi-environment configuration.
 * Tracks connected monitors and provides lookup methods.
 * Stores multiple monitor environments for different physical setups.
 */

import Gio from 'gi://Gio';
import type Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type {
  BoundingBox,
  Monitor,
  MonitorEnvironment,
  MonitorEnvironmentStorage,
} from '../../domain/types/index.js';
import { DEFAULT_MONITOR_HEIGHT, DEFAULT_MONITOR_WIDTH } from '../../domain/types/index.js';
import { MONITORS_FILE_NAME } from '../constants.js';
import { getExtensionDataPath } from '../file/index.js';

declare function log(message: string): void;

/**
 * Generate a hash ID from monitor geometries
 * Input: Combined geometry values (x, y, width, height) for all monitors
 * Output: 8-character hash string
 */
function generateEnvironmentId(monitors: Monitor[]): string {
  const sorted = [...monitors].sort((a, b) => a.index - b.index);
  const geometryString = sorted
    .map((m) => `${m.geometry.x},${m.geometry.y},${m.geometry.width},${m.geometry.height}`)
    .join('|');

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < geometryString.length; i++) {
    hash = (hash * 33) ^ geometryString.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export class MonitorManager {
  private monitors: Map<string, Monitor> = new Map();
  private monitorsChangedId: number | null = null;
  private storage: MonitorEnvironmentStorage = { environments: [], current: '' };
  private currentActiveCollectionId: string = '';
  private storageLoaded: boolean = false;

  /**
   * Detect all connected monitors
   * Also loads environment storage on first call
   */
  detectMonitors(): Map<string, Monitor> {
    // Load storage on first detect (lazy initialization)
    if (!this.storageLoaded) {
      this.loadStorage();
      this.storageLoaded = true;
    }
    const monitors = new Map<string, Monitor>();
    const nMonitors = global.display.get_n_monitors();
    const primaryMonitorIndex = global.display.get_primary_monitor();

    log(`[MonitorManager] Detecting ${nMonitors} monitors (primary: ${primaryMonitorIndex})`);

    for (let i = 0; i < nMonitors; i++) {
      const geometry = global.display.get_monitor_geometry(i);
      const workArea = Main.layoutManager.getWorkAreaForMonitor(i);
      const isPrimary = i === primaryMonitorIndex;

      const monitor: Monitor = {
        index: i,
        geometry: {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        workArea: {
          x: workArea.x,
          y: workArea.y,
          width: workArea.width,
          height: workArea.height,
        },
        isPrimary,
      };

      monitors.set(String(i), monitor);
      log(
        `[MonitorManager] Monitor ${i}: ${geometry.width}x${geometry.height} at (${geometry.x}, ${geometry.y})${isPrimary ? ' (PRIMARY)' : ''}`
      );
    }

    this.monitors = monitors;
    return monitors;
  }

  /**
   * Get monitor by key (e.g., "0", "1", "2")
   */
  getMonitorByKey(monitorKey: string): Monitor | null {
    return this.monitors.get(monitorKey) ?? null;
  }

  /**
   * Get current monitor (based on cursor position or focused window)
   * Uses GNOME Shell's built-in monitor detection
   */
  getCurrentMonitor(): Monitor | null {
    const monitorIndex = global.display.get_current_monitor();
    return this.getMonitorByKey(String(monitorIndex));
  }

  /**
   * Get monitor at position (for cursor-based detection)
   */
  getMonitorAtPosition(x: number, y: number): Monitor | null {
    for (const monitor of this.monitors.values()) {
      const { geometry } = monitor;
      if (
        x >= geometry.x &&
        x < geometry.x + geometry.width &&
        y >= geometry.y &&
        y < geometry.y + geometry.height
      ) {
        return monitor;
      }
    }
    return null;
  }

  /**
   * Get monitor for window (which monitor a window is on)
   */
  getMonitorForWindow(window: Meta.Window): Monitor | null {
    const rect = window.get_frame_rect();
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    return this.getMonitorAtPosition(centerX, centerY);
  }

  /**
   * Connect to monitor configuration changes
   */
  connectToMonitorChanges(onMonitorsChanged: () => void): void {
    if (this.monitorsChangedId !== null) {
      log('[MonitorManager] Already connected to monitors-changed signal');
      return;
    }

    // Use Main.layoutManager instead of global.display for monitors-changed signal
    this.monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
      log('[MonitorManager] Monitors configuration changed, re-detecting...');
      this.detectMonitors();
      onMonitorsChanged();
    });

    log('[MonitorManager] Connected to monitors-changed signal');
  }

  /**
   * Disconnect from monitor configuration changes
   */
  disconnectMonitorChanges(): void {
    if (this.monitorsChangedId !== null) {
      Main.layoutManager.disconnect(this.monitorsChangedId);
      this.monitorsChangedId = null;
      log('[MonitorManager] Disconnected from monitors-changed signal');
    }
  }

  /**
   * Calculate bounding box that contains all monitors
   */
  calculateBoundingBox(monitors: Monitor[]): BoundingBox {
    if (monitors.length === 0) {
      return { minX: 0, minY: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const monitor of monitors) {
      const { geometry } = monitor;
      minX = Math.min(minX, geometry.x);
      minY = Math.min(minY, geometry.y);
      maxX = Math.max(maxX, geometry.x + geometry.width);
      maxY = Math.max(maxY, geometry.y + geometry.height);
    }

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Get all monitors
   */
  getMonitors(): Map<string, Monitor> {
    return this.monitors;
  }

  /**
   * Load storage from file
   * Called during initialization to restore environment history
   */
  loadStorage(): void {
    const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
    const file = Gio.File.new_for_path(filePath);

    if (!file.query_exists(null)) {
      log('[MonitorManager] No storage file found, starting fresh');
      return;
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (success) {
        const json = new TextDecoder('utf-8').decode(contents);
        const parsed = JSON.parse(json);

        this.storage = parsed as MonitorEnvironmentStorage;
        log(`[MonitorManager] Loaded ${this.storage.environments.length} environments`);
      }
    } catch (e) {
      log(`[MonitorManager] Error loading storage: ${e}`);
    }
  }

  /**
   * Result of saveMonitors operation
   */
  public static readonly NO_ENVIRONMENT_CHANGE = null;

  /**
   * Save current monitor configuration to file
   * Maintains environment history for different monitor setups
   * Returns the collection ID to activate if environment changed, null otherwise
   */
  saveMonitors(): string | null {
    const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
    const file = Gio.File.new_for_path(filePath);
    let collectionToActivate: string | null = null;

    try {
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      // Update or create environment for current monitors
      const monitorsArray = Array.from(this.monitors.values());
      const envId = generateEnvironmentId(monitorsArray);
      const now = Date.now();
      const previousEnvId = this.storage.current;
      const environmentChanged = previousEnvId !== '' && previousEnvId !== envId;

      let environment = this.storage.environments.find((e) => e.id === envId);
      if (environment) {
        // Existing environment - update monitors and timestamp
        environment.monitors = monitorsArray;
        environment.lastActiveAt = now;

        // If environment changed, use the stored collection for this environment
        if (environmentChanged) {
          collectionToActivate = environment.lastActiveCollectionId;
          log(
            `[MonitorManager] Environment switched to ${envId}, activating collection: ${collectionToActivate}`
          );
        } else if (this.currentActiveCollectionId) {
          // Same environment - update collection if we have one
          environment.lastActiveCollectionId = this.currentActiveCollectionId;
        }
      } else {
        // New environment - create with default collection
        const defaultCollectionId = this.getDefaultCollectionId();
        environment = {
          id: envId,
          monitors: monitorsArray,
          lastActiveCollectionId: defaultCollectionId,
          lastActiveAt: now,
        };
        this.storage.environments.push(environment);
        collectionToActivate = defaultCollectionId;
        log(
          `[MonitorManager] New environment detected: ${envId} (${monitorsArray.length} monitors), activating: ${defaultCollectionId}`
        );
      }

      this.storage.current = envId;

      const json = JSON.stringify(this.storage, null, 2);
      file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

      log('[MonitorManager] Monitors saved successfully');
    } catch (e) {
      log(`[MonitorManager] Error saving monitors: ${e}`);
    }

    return collectionToActivate;
  }

  /**
   * Get default collection ID for new environments
   * Uses preset collection matching the monitor count
   */
  private getDefaultCollectionId(): string {
    const monitorCount = this.monitors.size;
    return `preset-${monitorCount}-monitor`;
  }

  /**
   * Set the current active collection ID
   * Call this when the user changes the collection in settings
   */
  setActiveCollectionId(collectionId: string): void {
    this.currentActiveCollectionId = collectionId;

    // Update current environment if it exists
    const currentEnv = this.storage.environments.find((e) => e.id === this.storage.current);
    if (currentEnv) {
      currentEnv.lastActiveCollectionId = collectionId;
      currentEnv.lastActiveAt = Date.now();
      this.saveMonitors();
    }
  }

  /**
   * Get the last active collection ID for the current environment
   */
  getLastActiveCollectionId(): string | null {
    const currentEnv = this.storage.environments.find((e) => e.id === this.storage.current);
    return currentEnv?.lastActiveCollectionId ?? null;
  }

  /**
   * Get storage (for settings screen to access all environments)
   */
  getStorage(): MonitorEnvironmentStorage {
    return this.storage;
  }

  /**
   * Get current environment
   */
  getCurrentEnvironment(): MonitorEnvironment | null {
    return this.storage.environments.find((e) => e.id === this.storage.current) ?? null;
  }

  /**
   * Find best matching environment for a collection
   * Priority: 1) Match monitor count, 2) Most recent
   */
  findEnvironmentForCollection(displayCount: number): MonitorEnvironment | null {
    // Filter environments with matching monitor count
    const matching = this.storage.environments.filter((e) => e.monitors.length === displayCount);

    if (matching.length > 0) {
      // Return most recent matching environment
      return matching.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
    }

    // No matching environment found
    return null;
  }

  /**
   * Get monitors for rendering a space with a specific display count
   * Returns monitors from matching environment, with inactive flags for monitors
   * that don't exist in the current physical setup
   */
  getMonitorsForRendering(displayCount: number): {
    monitors: Map<string, Monitor>;
    inactiveMonitorKeys: Set<string>;
  } {
    const currentMonitorCount = this.monitors.size;
    const inactiveMonitorKeys = new Set<string>();

    // If display count matches current monitors, use current monitors
    if (displayCount === currentMonitorCount) {
      return { monitors: this.monitors, inactiveMonitorKeys };
    }

    // Try to find environment with matching monitor count
    const environment = this.findEnvironmentForCollection(displayCount);
    if (environment) {
      const monitors = new Map<string, Monitor>();
      for (const monitor of environment.monitors) {
        const key = String(monitor.index);
        monitors.set(key, monitor);
        // Mark as inactive if this monitor doesn't exist in current setup
        if (!this.monitors.has(key)) {
          inactiveMonitorKeys.add(key);
        }
      }
      return { monitors, inactiveMonitorKeys };
    }

    // Fallback: create default monitors using current monitor as reference
    const monitors = new Map<string, Monitor>();
    const referenceMonitor = this.monitors.values().next().value as Monitor | undefined;
    const defaultWidth = referenceMonitor?.geometry.width ?? DEFAULT_MONITOR_WIDTH;
    const defaultHeight = referenceMonitor?.geometry.height ?? DEFAULT_MONITOR_HEIGHT;

    for (let i = 0; i < displayCount; i++) {
      const key = String(i);
      monitors.set(key, {
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
      // Mark as inactive if this monitor doesn't exist in current setup
      if (!this.monitors.has(key)) {
        inactiveMonitorKeys.add(key);
      }
    }

    return { monitors, inactiveMonitorKeys };
  }
}
