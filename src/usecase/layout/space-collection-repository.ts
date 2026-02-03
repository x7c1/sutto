import type { CollectionId, SpaceId } from '../../domain/layout/index.js';

/**
 * Raw space collection data structure
 * Used for persistence and transfer between layers
 */
export interface SpaceCollectionData {
  id: string;
  name: string;
  rows: SpacesRowData[];
}

export interface SpacesRowData {
  spaces: SpaceData[];
}

export interface SpaceData {
  id: string;
  enabled: boolean;
  displays: {
    [monitorKey: string]: LayoutGroupData;
  };
}

export interface LayoutGroupData {
  name: string;
  layouts: LayoutData[];
}

export interface LayoutData {
  id: string;
  hash: string;
  label: string;
  position: { x: string; y: string };
  size: { width: string; height: string };
}

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
