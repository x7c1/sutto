/**
 * Operations Factory
 *
 * Creates and manages Operations instances with their dependencies.
 * Provides singleton access to Operations instances.
 */

import { MONITORS_FILE_NAME } from '../../infra/constants.js';
import { FileMonitorCountRepository, getExtensionDataPath } from '../../infra/file/index.js';
import { GdkMonitorDetector } from '../../infra/monitor/gdk-monitor-detector.js';
import { uuidGenerator } from '../../libs/uuid/index.js';
import {
  PresetGeneratorOperations,
  SpaceCollectionOperations,
} from '../../operations/layout/index.js';
import { resolveSpaceCollectionRepository } from './repository-factory.js';

let spaceCollectionOperations: SpaceCollectionOperations | null = null;
let presetGeneratorOperations: PresetGeneratorOperations | null = null;

/**
 * Resolve the shared SpaceCollectionOperations instance.
 */
export function resolveSpaceCollectionOperations(): SpaceCollectionOperations {
  if (!spaceCollectionOperations) {
    spaceCollectionOperations = new SpaceCollectionOperations(resolveSpaceCollectionRepository());
  }
  return spaceCollectionOperations;
}

/**
 * Resolve the shared PresetGeneratorOperations instance.
 */
export function resolvePresetGeneratorOperations(): PresetGeneratorOperations {
  if (!presetGeneratorOperations) {
    const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
    presetGeneratorOperations = new PresetGeneratorOperations(
      resolveSpaceCollectionRepository(),
      new FileMonitorCountRepository(filePath),
      new GdkMonitorDetector(),
      uuidGenerator
    );
  }
  return presetGeneratorOperations;
}

/**
 * Reset Operations instances (for testing).
 */
export function resetOperations(): void {
  spaceCollectionOperations = null;
  presetGeneratorOperations = null;
}
