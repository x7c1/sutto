import Gio from 'gi://Gio';

import {
  CUSTOM_SPACE_COLLECTIONS_FILE_NAME,
  PRESET_SPACE_COLLECTIONS_FILE_NAME,
} from '../constants.js';
import type { SpaceCollection } from '../types/index.js';
import { getExtensionDataPath } from './extension-path.js';
import { generateUUID } from './uuid-generator.js';

// Use console.log for compatibility with both extension and preferences contexts
const log = (message: string): void => console.log(message);

function getPresetFilePath(): string {
  return getExtensionDataPath(PRESET_SPACE_COLLECTIONS_FILE_NAME);
}

function getCustomFilePath(): string {
  return getExtensionDataPath(CUSTOM_SPACE_COLLECTIONS_FILE_NAME);
}

function isValidSpaceCollectionArray(data: unknown): data is SpaceCollection[] {
  if (!Array.isArray(data)) {
    return false;
  }

  for (const item of data) {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    if (!('id' in item) || typeof item.id !== 'string') {
      return false;
    }
    if (!('name' in item) || typeof item.name !== 'string') {
      return false;
    }
    if (!('rows' in item) || !Array.isArray(item.rows)) {
      return false;
    }
  }

  return true;
}

function loadCollectionsFromFile(filePath: string): SpaceCollection[] {
  const file = Gio.File.new_for_path(filePath);

  if (!file.query_exists(null)) {
    return [];
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log(`[SpaceCollectionRepository] Failed to load file: ${filePath}`);
      return [];
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const data: unknown = JSON.parse(contentsString);

    if (!isValidSpaceCollectionArray(data)) {
      log(`[SpaceCollectionRepository] Invalid data format in: ${filePath}`);
      return [];
    }

    return data;
  } catch (e) {
    log(`[SpaceCollectionRepository] Error loading file ${filePath}: ${e}`);
    return [];
  }
}

function saveCollectionsToFile(filePath: string, collections: SpaceCollection[]): void {
  const file = Gio.File.new_for_path(filePath);

  try {
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }

    const json = JSON.stringify(collections, null, 2);
    file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    log(`[SpaceCollectionRepository] Saved collections to: ${filePath}`);
  } catch (e) {
    log(`[SpaceCollectionRepository] Error saving to ${filePath}: ${e}`);
  }
}

// ============================================================================
// Public API
// ============================================================================

export function loadPresetCollections(): SpaceCollection[] {
  return loadCollectionsFromFile(getPresetFilePath());
}

export function savePresetCollections(collections: SpaceCollection[]): void {
  saveCollectionsToFile(getPresetFilePath(), collections);
}

export function loadCustomCollections(): SpaceCollection[] {
  return loadCollectionsFromFile(getCustomFilePath());
}

export function saveCustomCollections(collections: SpaceCollection[]): void {
  saveCollectionsToFile(getCustomFilePath(), collections);
}

export function loadAllCollections(): SpaceCollection[] {
  const presets = loadPresetCollections();
  const customs = loadCustomCollections();
  return [...presets, ...customs];
}

export function addCustomCollection(collection: Omit<SpaceCollection, 'id'>): SpaceCollection {
  const newCollection: SpaceCollection = {
    ...collection,
    id: generateUUID(),
  };

  const existing = loadCustomCollections();
  existing.push(newCollection);
  saveCustomCollections(existing);

  log(`[SpaceCollectionRepository] Added custom collection: ${newCollection.name}`);
  return newCollection;
}

export function deleteCustomCollection(collectionId: string): boolean {
  const collections = loadCustomCollections();
  const index = collections.findIndex((c) => c.id === collectionId);

  if (index === -1) {
    log(`[SpaceCollectionRepository] Collection not found: ${collectionId}`);
    return false;
  }

  const deleted = collections.splice(index, 1)[0];
  saveCustomCollections(collections);

  log(`[SpaceCollectionRepository] Deleted custom collection: ${deleted.name}`);
  return true;
}

export function findCollectionById(collectionId: string): SpaceCollection | undefined {
  const all = loadAllCollections();
  return all.find((c) => c.id === collectionId);
}

export function updateSpaceEnabled(
  collectionId: string,
  spaceId: string,
  enabled: boolean
): boolean {
  // Try preset collections first
  const presets = loadPresetCollections();
  for (const collection of presets) {
    if (collection.id === collectionId) {
      for (const row of collection.rows) {
        for (const space of row.spaces) {
          if (space.id === spaceId) {
            space.enabled = enabled;
            savePresetCollections(presets);
            log(
              `[SpaceCollectionRepository] Updated space ${spaceId} enabled=${enabled} in preset collection`
            );
            return true;
          }
        }
      }
    }
  }

  // Try custom collections
  const customs = loadCustomCollections();
  for (const collection of customs) {
    if (collection.id === collectionId) {
      for (const row of collection.rows) {
        for (const space of row.spaces) {
          if (space.id === spaceId) {
            space.enabled = enabled;
            saveCustomCollections(customs);
            log(
              `[SpaceCollectionRepository] Updated space ${spaceId} enabled=${enabled} in custom collection`
            );
            return true;
          }
        }
      }
    }
  }

  log(`[SpaceCollectionRepository] Space ${spaceId} not found in collection ${collectionId}`);
  return false;
}
