/**
 * UseCase Factory
 *
 * Creates and manages UseCase instances with their dependencies.
 * Provides singleton access to UseCase instances.
 */

import { FileMonitorCountProvider } from '../infra/monitor/index.js';
import { generateUUID } from '../libs/uuid/index.js';
import { PresetGeneratorUseCase, SpaceCollectionUseCase } from '../usecase/layout/index.js';
import { getSpaceCollectionRepository } from './space-collection-repository.js';

let spaceCollectionUseCase: SpaceCollectionUseCase | null = null;
let presetGeneratorUseCase: PresetGeneratorUseCase | null = null;

const uuidGenerator = {
  generate: generateUUID,
};

/**
 * Get the shared SpaceCollectionUseCase instance.
 */
export function getSpaceCollectionUseCase(): SpaceCollectionUseCase {
  if (!spaceCollectionUseCase) {
    spaceCollectionUseCase = new SpaceCollectionUseCase(getSpaceCollectionRepository());
  }
  return spaceCollectionUseCase;
}

/**
 * Get the shared PresetGeneratorUseCase instance.
 */
export function getPresetGeneratorUseCase(): PresetGeneratorUseCase {
  if (!presetGeneratorUseCase) {
    presetGeneratorUseCase = new PresetGeneratorUseCase(
      getSpaceCollectionRepository(),
      new FileMonitorCountProvider(),
      uuidGenerator
    );
  }
  return presetGeneratorUseCase;
}

/**
 * Reset UseCase instances (for testing).
 */
export function resetUseCases(): void {
  spaceCollectionUseCase = null;
  presetGeneratorUseCase = null;
}
