/**
 * Raw Space Collection
 *
 * JSON format types and serialization/deserialization for SpaceCollection.
 */

import {
  CollectionId,
  LayoutId,
  type SpaceCollection,
  SpaceId,
} from '../../domain/layout/index.js';

export interface RawSpaceCollection {
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

export function deserializeSpaceCollection(raw: RawSpaceCollection): SpaceCollection {
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

export function serializeSpaceCollection(collection: SpaceCollection): RawSpaceCollection {
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

export function isValidRawSpaceCollectionArray(data: unknown): data is RawSpaceCollection[] {
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
