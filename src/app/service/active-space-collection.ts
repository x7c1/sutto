import {
  findCollectionById,
  loadAllCollections,
  loadPresetCollections,
} from '../repository/space-collection.js';
import type { SpaceCollection } from '../types/index.js';

// Use console.log for compatibility with both extension and preferences contexts
const log = (message: string): void => console.log(message);

/**
 * Get the active SpaceCollection based on the stored ID
 * Falls back to the first preset collection if the ID is empty or invalid
 *
 * @param activeId - The stored active collection ID from GSettings
 * @returns The active SpaceCollection, or undefined if no collections exist
 */
export function getActiveSpaceCollection(activeId: string): SpaceCollection | undefined {
  // If activeId is set, try to find it
  if (activeId) {
    const collection = findCollectionById(activeId);
    if (collection) {
      return collection;
    }
    log(`[ActiveSpaceCollection] Collection with ID "${activeId}" not found, falling back`);
  }

  // Fallback: use first preset collection
  const presets = loadPresetCollections();
  if (presets.length > 0) {
    log(`[ActiveSpaceCollection] Using first preset collection: ${presets[0].name}`);
    return presets[0];
  }

  // No presets available, try custom collections
  const all = loadAllCollections();
  if (all.length > 0) {
    log(`[ActiveSpaceCollection] Using first available collection: ${all[0].name}`);
    return all[0];
  }

  log('[ActiveSpaceCollection] No collections available');
  return undefined;
}

/**
 * Get the ID that should be used as active
 * Returns the provided ID if valid, otherwise returns the first preset's ID
 *
 * @param activeId - The stored active collection ID from GSettings
 * @returns The resolved active collection ID, or empty string if no collections exist
 */
export function resolveActiveSpaceCollectionId(activeId: string): string {
  const collection = getActiveSpaceCollection(activeId);
  return collection?.id ?? '';
}
