/**
 * Usecase Factory
 *
 * Creates and manages Usecase instances with their dependencies.
 * Provides singleton access to Usecase instances.
 */

import { MONITORS_FILE_NAME } from '../infra/constants.js';
import { FileMonitorCountRepository, getExtensionDataPath } from '../infra/file/index.js';
import { GdkMonitorDetector } from '../infra/monitor/index.js';
import { generateUUID } from '../libs/uuid/index.js';
import { PresetGeneratorUsecase, SpaceCollectionUsecase } from '../usecase/layout/index.js';
import { MonitorUsecase } from '../usecase/monitor/index.js';
import { resolveSpaceCollectionRepository } from './repository-factory.js';

let spaceCollectionUsecase: SpaceCollectionUsecase | null = null;
let presetGeneratorUsecase: PresetGeneratorUsecase | null = null;
let monitorUsecase: MonitorUsecase | null = null;

const uuidGenerator = {
  generate: generateUUID,
};

/**
 * Resolve the shared MonitorUsecase instance.
 */
export function resolveMonitorUsecase(): MonitorUsecase {
  if (!monitorUsecase) {
    const filePath = getExtensionDataPath(MONITORS_FILE_NAME);
    monitorUsecase = new MonitorUsecase(
      new FileMonitorCountRepository(filePath),
      new GdkMonitorDetector()
    );
  }
  return monitorUsecase;
}

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
      resolveMonitorUsecase(),
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
  monitorUsecase = null;
}
