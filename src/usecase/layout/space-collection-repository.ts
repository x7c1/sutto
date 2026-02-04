import type { CollectionId, SpaceCollection, SpaceId } from '../../domain/layout/index.js';

/**
 * Interface for space collection persistence
 * Infrastructure layer implements this interface with file-based storage
 */
export interface SpaceCollectionRepository {
  /**
   * Load preset collections
   */
  loadPresetCollections(): SpaceCollection[];

  /**
   * Save preset collections
   */
  savePresetCollections(collections: SpaceCollection[]): void;

  /**
   * Load custom collections
   */
  loadCustomCollections(): SpaceCollection[];

  /**
   * Save custom collections
   */
  saveCustomCollections(collections: SpaceCollection[]): void;

  /**
   * Load all collections (preset + custom)
   */
  loadAllCollections(): SpaceCollection[];

  /**
   * Add a new custom collection
   * Returns the created collection with generated ID
   */
  addCustomCollection(collection: Omit<SpaceCollection, 'id'>): SpaceCollection;

  /**
   * Delete a custom collection by ID
   * Returns true if deleted, false if not found
   */
  deleteCustomCollection(collectionId: CollectionId): boolean;

  /**
   * Find a collection by ID
   */
  findCollectionById(collectionId: CollectionId): SpaceCollection | undefined;

  /**
   * Update space enabled state
   * Returns true if updated, false if not found
   */
  updateSpaceEnabled(collectionId: CollectionId, spaceId: SpaceId, enabled: boolean): boolean;
}
