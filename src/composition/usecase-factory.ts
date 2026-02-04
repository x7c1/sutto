/**
 * Usecase Factory
 *
 * Creates and manages Usecase instances with their dependencies.
 * Provides singleton access to Usecase instances.
 */

import { FileMonitorCountProvider } from '../infra/monitor/gdk-monitor-detector.js';
import { generateUUID } from '../libs/uuid/index.js';
import { PresetGeneratorUsecase, SpaceCollectionUsecase } from '../usecase/layout/index.js';
import { resolveSpaceCollectionRepository } from './repository-factory.js';

let spaceCollectionUsecase: SpaceCollectionUsecase | null = null;
let presetGeneratorUsecase: PresetGeneratorUsecase | null = null;

const uuidGenerator = {
  generate: generateUUID,
};

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
    presetGeneratorUsecase = new PresetGeneratorUsecase(
      resolveSpaceCollectionRepository(),
      new FileMonitorCountProvider(),
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
