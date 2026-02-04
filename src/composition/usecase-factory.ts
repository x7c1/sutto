/**
 * UseCase Factory
 *
 * Creates and manages UseCase instances with their dependencies.
 * Provides singleton access to UseCase instances.
 */

import { FileMonitorCountProvider } from '../infra/monitor/gdk-monitor-detector.js';
import { generateUUID } from '../libs/uuid/index.js';
import { PresetGeneratorUseCase, SpaceCollectionUseCase } from '../usecase/layout/index.js';
import { resolveSpaceCollectionRepository } from './repository-factory.js';

let spaceCollectionUsecase: SpaceCollectionUseCase | null = null;
let presetGeneratorUsecase: PresetGeneratorUseCase | null = null;

const uuidGenerator = {
  generate: generateUUID,
};

/**
 * Resolve the shared SpaceCollectionUseCase instance.
 */
export function resolveSpaceCollectionUsecase(): SpaceCollectionUseCase {
  if (!spaceCollectionUsecase) {
    spaceCollectionUsecase = new SpaceCollectionUseCase(resolveSpaceCollectionRepository());
  }
  return spaceCollectionUsecase;
}

/**
 * Resolve the shared PresetGeneratorUseCase instance.
 */
export function resolvePresetGeneratorUsecase(): PresetGeneratorUseCase {
  if (!presetGeneratorUsecase) {
    presetGeneratorUsecase = new PresetGeneratorUseCase(
      resolveSpaceCollectionRepository(),
      new FileMonitorCountProvider(),
      uuidGenerator
    );
  }
  return presetGeneratorUsecase;
}

/**
 * Reset UseCase instances (for testing).
 */
export function resetUsecases(): void {
  spaceCollectionUsecase = null;
  presetGeneratorUsecase = null;
}
