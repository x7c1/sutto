/**
 * Space Collection Repository Factory
 *
 * Creates and manages the singleton instance of SpaceCollectionRepository.
 * This keeps the concrete implementation details in the composition layer.
 */

import {
  CUSTOM_SPACE_COLLECTIONS_FILE_NAME,
  PRESET_SPACE_COLLECTIONS_FILE_NAME,
} from '../infra/constants.js';
import { FileSpaceCollectionRepository, getExtensionDataPath } from '../infra/file/index.js';
import { generateUUID } from '../libs/uuid/index.js';
import type { SpaceCollectionRepository } from '../usecase/layout/index.js';

let repositoryInstance: SpaceCollectionRepository | null = null;

/**
 * Get the shared SpaceCollectionRepository instance.
 * Creates the instance on first call (lazy initialization).
 */
export function getSpaceCollectionRepository(): SpaceCollectionRepository {
  if (!repositoryInstance) {
    repositoryInstance = new FileSpaceCollectionRepository(
      getExtensionDataPath(PRESET_SPACE_COLLECTIONS_FILE_NAME),
      getExtensionDataPath(CUSTOM_SPACE_COLLECTIONS_FILE_NAME),
      generateUUID
    );
  }
  return repositoryInstance;
}

/**
 * Reset the repository instance (for testing purposes).
 */
export function resetSpaceCollectionRepository(): void {
  repositoryInstance = null;
}
