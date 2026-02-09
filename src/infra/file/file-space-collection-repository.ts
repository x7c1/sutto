import Gio from 'gi://Gio';

import {
  CollectionId,
  LayoutId,
  type Space,
  type SpaceCollection,
  SpaceId,
} from '../../domain/layout/index.js';
import type { UUIDGenerator } from '../../libs/uuid/index.js';
import type { SpaceCollectionRepository } from '../../operations/layout/space-collection-repository.js';

const log = (message: string): void => console.log(message);

interface RawSpaceCollection {
  id: string;
  name: string;
  rows: RawSpacesRow[];
}

interface RawSpacesRow {
  spaces: RawSpace[];
}

interface RawSpace {
  id: string;
  enabled: boolean;
  displays: {
    [monitorKey: string]: RawLayoutGroup;
  };
}

interface RawLayoutGroup {
  name: string;
  layouts: RawLayout[];
}

interface RawLayout {
  id: string;
  hash: string;
  label: string;
  position: { x: string; y: string };
  size: { width: string; height: string };
}

/**
 * File-based implementation of SpaceCollectionRepository
 * Uses JSON format for storage
 */
export class FileSpaceCollectionRepository implements SpaceCollectionRepository {
  constructor(
    private readonly presetFilePath: string,
    private readonly customFilePath: string,
    private readonly uuidGenerator: UUIDGenerator
  ) {}

  loadPresetCollections(): SpaceCollection[] {
    return this.loadCollectionsFromFile(this.presetFilePath);
  }

  savePresetCollections(collections: SpaceCollection[]): void {
    this.saveCollectionsToFile(this.presetFilePath, collections);
  }

  loadCustomCollections(): SpaceCollection[] {
    return this.loadCollectionsFromFile(this.customFilePath);
  }

  saveCustomCollections(collections: SpaceCollection[]): void {
    this.saveCollectionsToFile(this.customFilePath, collections);
  }

  loadAllCollections(): SpaceCollection[] {
    const presets = this.loadPresetCollections();
    const customs = this.loadCustomCollections();
    return [...presets, ...customs];
  }

  addCustomCollection(collection: Omit<SpaceCollection, 'id'>): SpaceCollection {
    const newCollection: SpaceCollection = {
      ...collection,
      id: new CollectionId(this.uuidGenerator.generate()),
    };

    const existing = this.loadCustomCollections();
    existing.push(newCollection);
    this.saveCustomCollections(existing);

    log(`[SpaceCollectionRepository] Added custom collection: ${newCollection.name}`);
    return newCollection;
  }

  deleteCustomCollection(collectionId: CollectionId): boolean {
    const collections = this.loadCustomCollections();
    const index = collections.findIndex((c) => c.id.equals(collectionId));

    if (index === -1) {
      log(`[SpaceCollectionRepository] Collection not found: ${collectionId.toString()}`);
      return false;
    }

    const deleted = collections.splice(index, 1)[0];
    this.saveCustomCollections(collections);

    log(`[SpaceCollectionRepository] Deleted custom collection: ${deleted.name}`);
    return true;
  }

  findCollectionById(collectionId: CollectionId): SpaceCollection | undefined {
    const all = this.loadAllCollections();
    return all.find((c) => c.id.equals(collectionId));
  }

  updateSpaceEnabled(collectionId: CollectionId, spaceId: SpaceId, enabled: boolean): boolean {
    const presets = this.loadPresetCollections();
    const presetSpace = this.findSpace(presets, collectionId, spaceId);
    if (presetSpace) {
      presetSpace.enabled = enabled;
      this.savePresetCollections(presets);
      log(
        `[SpaceCollectionRepository] Updated space ${spaceId.toString()} enabled=${enabled} in preset collection`
      );
      return true;
    }

    const customs = this.loadCustomCollections();
    const customSpace = this.findSpace(customs, collectionId, spaceId);
    if (customSpace) {
      customSpace.enabled = enabled;
      this.saveCustomCollections(customs);
      log(
        `[SpaceCollectionRepository] Updated space ${spaceId.toString()} enabled=${enabled} in custom collection`
      );
      return true;
    }

    log(
      `[SpaceCollectionRepository] Space ${spaceId.toString()} not found in collection ${collectionId.toString()}`
    );
    return false;
  }

  private loadCollectionsFromFile(filePath: string): SpaceCollection[] {
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

      if (!this.isValidRawSpaceCollectionArray(data)) {
        log(`[SpaceCollectionRepository] Invalid data format in: ${filePath}`);
        return [];
      }

      return data.map((raw) => this.deserializeCollection(raw));
    } catch (e) {
      log(`[SpaceCollectionRepository] Error loading file ${filePath}: ${e}`);
      return [];
    }
  }

  private saveCollectionsToFile(filePath: string, collections: SpaceCollection[]): void {
    const file = Gio.File.new_for_path(filePath);

    try {
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      const rawCollections = collections.map((c) => this.serializeCollection(c));
      const json = JSON.stringify(rawCollections, null, 2);
      file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

      log(`[SpaceCollectionRepository] Saved collections to: ${filePath}`);
    } catch (e) {
      log(`[SpaceCollectionRepository] Error saving to ${filePath}: ${e}`);
    }
  }

  private deserializeCollection(raw: RawSpaceCollection): SpaceCollection {
    return {
      id: new CollectionId(raw.id),
      name: raw.name,
      rows: raw.rows.map((row) => ({
        spaces: row.spaces.map((space) => ({
          id: new SpaceId(space.id),
          enabled: space.enabled,
          displays: Object.fromEntries(
            Object.entries(space.displays).map(([key, group]) => [
              key,
              {
                name: group.name,
                layouts: group.layouts.map((layout) => ({
                  id: new LayoutId(layout.id),
                  hash: layout.hash,
                  label: layout.label,
                  position: layout.position,
                  size: layout.size,
                })),
              },
            ])
          ),
        })),
      })),
    };
  }

  private serializeCollection(collection: SpaceCollection): RawSpaceCollection {
    return {
      id: collection.id.toString(),
      name: collection.name,
      rows: collection.rows.map((row) => ({
        spaces: row.spaces.map((space) => ({
          id: space.id.toString(),
          enabled: space.enabled,
          displays: Object.fromEntries(
            Object.entries(space.displays).map(([key, group]) => [
              key,
              {
                name: group.name,
                layouts: group.layouts.map((layout) => ({
                  id: layout.id.toString(),
                  hash: layout.hash,
                  label: layout.label,
                  position: layout.position,
                  size: layout.size,
                })),
              },
            ])
          ),
        })),
      })),
    };
  }

  private isValidRawSpaceCollectionArray(data: unknown): data is RawSpaceCollection[] {
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

  private findSpace(
    collections: SpaceCollection[],
    collectionId: CollectionId,
    spaceId: SpaceId
  ): Space | null {
    const collection = collections.find((c) => c.id.equals(collectionId));
    if (!collection) return null;
    return collection.rows.flatMap((row) => row.spaces).find((s) => s.id.equals(spaceId)) ?? null;
  }
}
