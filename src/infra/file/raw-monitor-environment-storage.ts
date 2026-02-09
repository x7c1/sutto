/**
 * Monitor Environment Serializer
 *
 * Handles serialization/deserialization of MonitorEnvironmentStorage
 * between domain objects and raw JSON format for file storage.
 */

import { CollectionId } from '../../domain/layout/index.js';
import type { MonitorEnvironment, MonitorEnvironmentStorage } from '../../domain/monitor/index.js';

const log = (message: string): void => console.log(message);

interface RawMonitorEnvironment {
  id: string;
  monitors: MonitorEnvironment['monitors'];
  lastActiveCollectionId: string;
  lastActiveAt: number;
}

export interface RawMonitorEnvironmentStorage {
  environments: RawMonitorEnvironment[];
  current: string;
}

export function deserializeMonitorEnvironmentStorage(
  raw: RawMonitorEnvironmentStorage
): MonitorEnvironmentStorage {
  return {
    environments: raw.environments.map((env) => ({
      id: env.id,
      monitors: env.monitors,
      lastActiveCollectionId: parseCollectionId(env.lastActiveCollectionId),
      lastActiveAt: env.lastActiveAt,
    })),
    current: raw.current,
  };
}

export function serializeMonitorEnvironmentStorage(
  storage: MonitorEnvironmentStorage
): RawMonitorEnvironmentStorage {
  return {
    environments: storage.environments.map((env) => ({
      id: env.id,
      monitors: env.monitors,
      lastActiveCollectionId: env.lastActiveCollectionId?.toString() ?? '',
      lastActiveAt: env.lastActiveAt,
    })),
    current: storage.current,
  };
}

function parseCollectionId(value: string): CollectionId | null {
  if (!value) return null;
  try {
    return new CollectionId(value);
  } catch {
    log(`[MonitorEnvironmentSerializer] Invalid collection ID "${value}", treating as null`);
    return null;
  }
}
