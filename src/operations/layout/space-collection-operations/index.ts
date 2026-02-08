import { CollectionId, type SpaceCollection, SpaceId } from '../../../domain/layout/index.js';
import type { SpaceCollectionRepository } from '../space-collection-repository.js';
import { importLayoutConfigurationFromJson } from './import-collection.js';

export class SpaceCollectionOperations {
  constructor(private readonly repository: SpaceCollectionRepository) {}

  loadPresetCollections(): SpaceCollection[] {
    return this.repository.loadPresetCollections();
  }

  savePresetCollections(collections: SpaceCollection[]): void {
    this.repository.savePresetCollections(collections);
  }

  loadCustomCollections(): SpaceCollection[] {
    return this.repository.loadCustomCollections();
  }

  saveCustomCollections(collections: SpaceCollection[]): void {
    this.repository.saveCustomCollections(collections);
  }

  loadAllCollections(): SpaceCollection[] {
    return this.repository.loadAllCollections();
  }

  addCustomCollection(collection: Omit<SpaceCollection, 'id'>): SpaceCollection {
    return this.repository.addCustomCollection(collection);
  }

  deleteCustomCollection(collectionId: string): boolean {
    const id = new CollectionId(collectionId);
    return this.repository.deleteCustomCollection(id);
  }

  findCollectionById(collectionId: string): SpaceCollection | undefined {
    const id = new CollectionId(collectionId);
    return this.repository.findCollectionById(id);
  }

  updateSpaceEnabled(collectionId: string, spaceId: string, enabled: boolean): boolean {
    const cId = new CollectionId(collectionId);
    const sId = new SpaceId(spaceId);
    return this.repository.updateSpaceEnabled(cId, sId, enabled);
  }

  /**
   * Get the active SpaceCollection based on the stored ID.
   * Falls back to the first preset collection if the ID is empty or invalid.
   */
  getActiveSpaceCollection(activeId: string): SpaceCollection | undefined {
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

  importFromJson(jsonString: string): SpaceCollection | null {
    return importLayoutConfigurationFromJson(this.repository, jsonString);
  }
}
