import {
  DEFAULT_MONITOR_HEIGHT,
  DEFAULT_MONITOR_WIDTH,
  type Monitor,
  type MonitorEnvironment,
  type MonitorEnvironmentStorage,
} from '../../domain/monitor/index.js';
import type { MonitorEnvironmentRepository } from './monitor-environment-repository.js';
import type { MonitorProvider } from './monitor-provider.js';

declare function log(message: string): void;

/**
 * Operations for managing monitor environments.
 * Orchestrates monitor detection and environment storage.
 */
export class MonitorEnvironmentOperations {
  private storage: MonitorEnvironmentStorage = { environments: [], current: '' };
  private currentActiveCollectionId: string = '';
  private initialized: boolean = false;

  constructor(
    private readonly monitorProvider: MonitorProvider,
    private readonly repository: MonitorEnvironmentRepository
  ) {}

  /**
   * Initialize by loading storage from repository.
   */
  initialize(): void {
    if (this.initialized) return;

    const loaded = this.repository.load();
    if (loaded) {
      this.storage = loaded;
      log(`[MonitorEnvironmentOperations] Loaded ${this.storage.environments.length} environments`);
    } else {
      log('[MonitorEnvironmentOperations] No storage found, starting fresh');
    }
    this.initialized = true;
  }

  /**
   * Detect monitors and save environment.
   * Returns the collection ID to activate if environment changed, null otherwise.
   */
  detectAndSaveMonitors(): string | null {
    this.initialize();
    this.monitorProvider.detectMonitors();

    const monitors = this.monitorProvider.getMonitors();
    const monitorsArray = Array.from(monitors.values());
    const envId = generateEnvironmentId(monitorsArray);
    const now = Date.now();
    const previousEnvId = this.storage.current;
    const environmentChanged = previousEnvId !== '' && previousEnvId !== envId;

    let collectionToActivate: string | null = null;
    let environment = this.storage.environments.find((e) => e.id === envId);

    if (environment) {
      environment.monitors = monitorsArray;
      environment.lastActiveAt = now;

      if (environmentChanged) {
        collectionToActivate = environment.lastActiveCollectionId;
        log(
          `[MonitorEnvironmentOperations] Environment switched to ${envId}, activating collection: ${collectionToActivate}`
        );
      } else if (this.currentActiveCollectionId) {
        environment.lastActiveCollectionId = this.currentActiveCollectionId;
      }
    } else {
      const defaultCollectionId = this.getDefaultCollectionId(monitors.size);
      environment = {
        id: envId,
        monitors: monitorsArray,
        lastActiveCollectionId: defaultCollectionId,
        lastActiveAt: now,
      };
      this.storage.environments.push(environment);
      collectionToActivate = defaultCollectionId;
      log(
        `[MonitorEnvironmentOperations] New environment detected: ${envId} (${monitorsArray.length} monitors), activating: ${defaultCollectionId}`
      );
    }

    this.storage.current = envId;
    this.repository.save(this.storage);
    log('[MonitorEnvironmentOperations] Monitors saved successfully');

    return collectionToActivate;
  }

  /**
   * Set the current active collection ID.
   */
  setActiveCollectionId(collectionId: string): void {
    this.currentActiveCollectionId = collectionId;

    const currentEnv = this.storage.environments.find((e) => e.id === this.storage.current);
    if (currentEnv) {
      currentEnv.lastActiveCollectionId = collectionId;
      currentEnv.lastActiveAt = Date.now();
      this.repository.save(this.storage);
    }
  }

  /**
   * Get the last active collection ID for the current environment.
   */
  getLastActiveCollectionId(): string | null {
    const currentEnv = this.storage.environments.find((e) => e.id === this.storage.current);
    return currentEnv?.lastActiveCollectionId ?? null;
  }

  /**
   * Get storage (for settings screen).
   */
  getStorage(): MonitorEnvironmentStorage {
    return this.storage;
  }

  /**
   * Get current environment.
   */
  getCurrentEnvironment(): MonitorEnvironment | null {
    return this.storage.environments.find((e) => e.id === this.storage.current) ?? null;
  }

  getMonitors(): Map<string, Monitor> {
    return this.monitorProvider.getMonitors();
  }

  getMonitorAtPosition(x: number, y: number): Monitor | null {
    return this.monitorProvider.getMonitorAtPosition(x, y);
  }

  getMonitorsForRendering(displayCount: number): {
    monitors: Map<string, Monitor>;
    inactiveMonitorKeys: Set<string>;
  } {
    const currentMonitors = this.monitorProvider.getMonitors();
    const currentMonitorCount = currentMonitors.size;
    const inactiveMonitorKeys = new Set<string>();

    if (displayCount === currentMonitorCount) {
      return { monitors: currentMonitors, inactiveMonitorKeys };
    }

    const environment = this.findEnvironmentForCollection(displayCount);
    if (environment) {
      const monitors = new Map<string, Monitor>();
      for (const monitor of environment.monitors) {
        const key = String(monitor.index);
        monitors.set(key, monitor);
        if (!currentMonitors.has(key)) {
          inactiveMonitorKeys.add(key);
        }
      }
      return { monitors, inactiveMonitorKeys };
    }

    // Fallback: create default monitors
    const monitors = new Map<string, Monitor>();
    const referenceMonitor = currentMonitors.values().next().value as Monitor | undefined;
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
      if (!currentMonitors.has(key)) {
        inactiveMonitorKeys.add(key);
      }
    }

    return { monitors, inactiveMonitorKeys };
  }

  private getDefaultCollectionId(monitorCount: number): string {
    return `preset-${monitorCount}-monitor`;
  }

  private findEnvironmentForCollection(displayCount: number): MonitorEnvironment | null {
    const matching = this.storage.environments.filter((e) => e.monitors.length === displayCount);
    if (matching.length > 0) {
      return matching.sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0];
    }
    return null;
  }
}

/**
 * Generate a hash ID from monitor geometries.
 */
function generateEnvironmentId(monitors: Monitor[]): string {
  const sorted = [...monitors].sort((a, b) => a.index - b.index);
  const geometryString = sorted
    .map((m) => `${m.geometry.x},${m.geometry.y},${m.geometry.width},${m.geometry.height}`)
    .join('|');

  let hash = 5381;
  for (let i = 0; i < geometryString.length; i++) {
    hash = (hash * 33) ^ geometryString.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
