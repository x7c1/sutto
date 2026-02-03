import { getSpaceCollectionRepository } from '../../composition/index.js';
import { CollectionId, SpaceId } from '../../domain/layout/index.js';
import type { SpaceCollectionData } from '../../usecase/layout/index.js';
import type { SpaceCollection } from '../types/index.js';

// Use composition layer's shared repository
function getRepository() {
  return getSpaceCollectionRepository();
}

export function loadPresetCollections(): SpaceCollection[] {
  return getRepository().loadPresetCollections() as SpaceCollection[];
}

export function savePresetCollections(collections: SpaceCollection[]): void {
  getRepository().savePresetCollections(collections as SpaceCollectionData[]);
}

export function loadCustomCollections(): SpaceCollection[] {
  return getRepository().loadCustomCollections() as SpaceCollection[];
}

export function saveCustomCollections(collections: SpaceCollection[]): void {
  getRepository().saveCustomCollections(collections as SpaceCollectionData[]);
}

export function loadAllCollections(): SpaceCollection[] {
  return getRepository().loadAllCollections() as SpaceCollection[];
}

export function addCustomCollection(collection: Omit<SpaceCollection, 'id'>): SpaceCollection {
  return getRepository().addCustomCollection(
    collection as Omit<SpaceCollectionData, 'id'>
  ) as SpaceCollection;
}

export function deleteCustomCollection(collectionId: string): boolean {
  const id = CollectionId.tryCreate(collectionId);
  if (!id) {
    return false;
  }
  return getRepository().deleteCustomCollection(id);
}

export function findCollectionById(collectionId: string): SpaceCollection | undefined {
  const id = CollectionId.tryCreate(collectionId);
  if (!id) {
    return undefined;
  }
  return getRepository().findCollectionById(id) as SpaceCollection | undefined;
}

export function updateSpaceEnabled(
  collectionId: string,
  spaceId: string,
  enabled: boolean
): boolean {
  const cId = CollectionId.tryCreate(collectionId);
  const sId = SpaceId.tryCreate(spaceId);
  if (!cId || !sId) {
    return false;
  }
  return getRepository().updateSpaceEnabled(cId, sId, enabled);
}
