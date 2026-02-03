import { CollectionId, SpaceId } from '../../domain/layout/index.js';
import type {
  SpaceCollectionData,
  SpaceCollectionRepository,
} from './space-collection-repository.js';

/**
 * Use case for managing space collections.
 * Provides high-level operations using the injected repository.
 */
export class SpaceCollectionUseCase {
  constructor(private readonly repository: SpaceCollectionRepository) {}

  loadPresetCollections(): SpaceCollectionData[] {
    return this.repository.loadPresetCollections();
  }

  savePresetCollections(collections: SpaceCollectionData[]): void {
    this.repository.savePresetCollections(collections);
  }

  loadCustomCollections(): SpaceCollectionData[] {
    return this.repository.loadCustomCollections();
  }

  saveCustomCollections(collections: SpaceCollectionData[]): void {
    this.repository.saveCustomCollections(collections);
  }

  loadAllCollections(): SpaceCollectionData[] {
    return this.repository.loadAllCollections();
  }

  addCustomCollection(collection: Omit<SpaceCollectionData, 'id'>): SpaceCollectionData {
    return this.repository.addCustomCollection(collection);
  }

  deleteCustomCollection(collectionId: string): boolean {
    const id = CollectionId.tryCreate(collectionId);
    if (!id) {
      return false;
    }
    return this.repository.deleteCustomCollection(id);
  }

  findCollectionById(collectionId: string): SpaceCollectionData | undefined {
    const id = CollectionId.tryCreate(collectionId);
    if (!id) {
      return undefined;
    }
    return this.repository.findCollectionById(id);
  }

  updateSpaceEnabled(collectionId: string, spaceId: string, enabled: boolean): boolean {
    const cId = CollectionId.tryCreate(collectionId);
    const sId = SpaceId.tryCreate(spaceId);
    if (!cId || !sId) {
      return false;
    }
    return this.repository.updateSpaceEnabled(cId, sId, enabled);
  }

  /**
   * Get the active SpaceCollection based on the stored ID.
   * Falls back to the first preset collection if the ID is empty or invalid.
   */
  getActiveSpaceCollection(activeId: string): SpaceCollectionData | undefined {
    if (activeId) {
      const collection = this.findCollectionById(activeId);
      if (collection) {
        return collection;
      }
    }

    const presets = this.loadPresetCollections();
    if (presets.length > 0) {
      return presets[0];
    }

    const all = this.loadAllCollections();
    if (all.length > 0) {
      return all[0];
    }

    return undefined;
  }

  /**
   * Get the ID that should be used as active.
   * Returns the provided ID if valid, otherwise returns the first preset's ID.
   */
  resolveActiveSpaceCollectionId(activeId: string): string {
    const collection = this.getActiveSpaceCollection(activeId);
    return collection?.id ?? '';
  }
}
