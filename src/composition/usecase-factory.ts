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

let spaceCollectionUseCase: SpaceCollectionUseCase | null = null;
let presetGeneratorUseCase: PresetGeneratorUseCase | null = null;

const uuidGenerator = {
  generate: generateUUID,
};

/**
 * Resolve the shared SpaceCollectionUseCase instance.
 */
export function resolveSpaceCollectionUseCase(): SpaceCollectionUseCase {
  if (!spaceCollectionUseCase) {
    spaceCollectionUseCase = new SpaceCollectionUseCase(resolveSpaceCollectionRepository());
  }
  return spaceCollectionUseCase;
}

/**
 * Resolve the shared PresetGeneratorUseCase instance.
 */
export function resolvePresetGeneratorUseCase(): PresetGeneratorUseCase {
  if (!presetGeneratorUseCase) {
    presetGeneratorUseCase = new PresetGeneratorUseCase(
      resolveSpaceCollectionRepository(),
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
