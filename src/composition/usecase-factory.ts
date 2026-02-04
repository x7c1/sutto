/**
 * Usecase Factory
 *
 * Creates and manages Usecase instances with their dependencies.
 * Provides singleton access to Usecase instances.
 */

import { MONITORS_FILE_NAME } from '../infra/constants.js';
import { FileMonitorCountRepository, getExtensionDataPath } from '../infra/file/index.js';
import { GdkMonitorDetector } from '../infra/monitor/index.js';
import { uuidGenerator } from '../libs/uuid/index.js';
import { PresetGeneratorUsecase, SpaceCollectionUsecase } from '../usecase/layout/index.js';
import { resolveSpaceCollectionRepository } from './repository-factory.js';

let spaceCollectionUsecase: SpaceCollectionUsecase | null = null;
let presetGeneratorUsecase: PresetGeneratorUsecase | null = null;

/**
 * Resolve the shared SpaceCollectionUsecase instance.
 */
export function resolveSpaceCollectionUsecase(): SpaceCollectionUsecase {
  if (!spaceCollectionUsecase) {
    spaceCollectionUsecase = new SpaceCollectionUsecase(resolveSpaceCollectionRepository());
  }
  return spaceCollectionUsecase;
}

/**
 * Resolve the shared PresetGeneratorUsecase instance.
 */
export function resolvePresetGeneratorUsecase(): PresetGeneratorUsecase {
  if (!presetGeneratorUsecase) {
    const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
    presetGeneratorUsecase = new PresetGeneratorUsecase(
      resolveSpaceCollectionRepository(),
      new FileMonitorCountRepository(filePath),
      new GdkMonitorDetector(),
      uuidGenerator
    );
  }
  return presetGeneratorUsecase;
}

/**
 * Reset Usecase instances (for testing).
 */
export function resetUsecases(): void {
  spaceCollectionUsecase = null;
  presetGeneratorUsecase = null;
}
