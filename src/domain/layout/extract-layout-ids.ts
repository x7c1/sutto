import type { SpaceCollection } from './types.js';

/**
 * Extract all layout IDs from a list of SpaceCollections
 */
export function extractLayoutIds(collections: SpaceCollection[]): Set<string> {
  const ids = new Set<string>();

  for (const collection of collections) {
    for (const row of collection.rows) {
      for (const space of row.spaces) {
        for (const monitorKey in space.displays) {
          const layoutGroup = space.displays[monitorKey];
          for (const layout of layoutGroup.layouts) {
            ids.add(layout.id);
          }
        }
      }
    }
  }

  return ids;
}
