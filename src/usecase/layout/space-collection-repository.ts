import type { CollectionId, SpaceCollectionData, SpaceId } from '../../domain/layout/index.js';

/**
 * Interface for space collection persistence
 * Infrastructure layer implements this interface with file-based storage
 */
export interface SpaceCollectionRepository {
  /**
   * Load preset collections
   */
  loadPresetCollections(): SpaceCollectionData[];

  /**
   * Save preset collections
   */
  savePresetCollections(collections: SpaceCollectionData[]): void;

  /**
   * Load custom collections
   */
  loadCustomCollections(): SpaceCollectionData[];

  /**
   * Save custom collections
   */
  saveCustomCollections(collections: SpaceCollectionData[]): void;

  /**
   * Load all collections (preset + custom)
   */
  loadAllCollections(): SpaceCollectionData[];

  /**
   * Add a new custom collection
   * Returns the created collection with generated ID
   */
  addCustomCollection(collection: Omit<SpaceCollectionData, 'id'>): SpaceCollectionData;

  /**
   * Delete a custom collection by ID
   * Returns true if deleted, false if not found
   */
  deleteCustomCollection(collectionId: CollectionId): boolean;

  /**
   * Find a collection by ID
   */
  findCollectionById(collectionId: CollectionId): SpaceCollectionData | undefined;

  /**
   * Update space enabled state
   * Returns true if updated, false if not found
   */
  updateSpaceEnabled(collectionId: CollectionId, spaceId: SpaceId, enabled: boolean): boolean;
}
