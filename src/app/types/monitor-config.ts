export interface Monitor {
  index: number; // 0-based monitor index ("0", "1", "2"...)
  geometry: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Monitor environment - stores monitors configuration for a specific physical setup
 */
export interface MonitorEnvironment {
  id: string; // Hash computed from all monitors' geometry data
  monitors: Monitor[];
  lastActiveCollectionId: string;
  lastActiveAt: number; // Timestamp when environment was last active
}

/**
 * Multi-environment monitor storage structure
 */
export interface MonitorEnvironmentStorage {
  environments: MonitorEnvironment[];
  current: string; // ID of the current environment
}
