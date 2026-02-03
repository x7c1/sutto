/**
 * Composition Layer
 *
 * Responsible for dependency injection and wiring concrete implementations.
 * This layer knows about concrete classes from all layers and composes them together.
 *
 * Guidelines:
 * - Create factory functions that return configured instances
 * - Import concrete implementations here
 * - Export only factory functions, not concrete classes
 * - Other layers should depend on interfaces, not concrete implementations
 */

import type { SpaceCollectionData } from '../domain/layout/index.js';
import type { MonitorType } from '../domain/layout/preset-generator.js';
import {
  getPresetGeneratorUseCase,
  getSpaceCollectionUseCase,
  resetUseCases,
} from './use-case-factory.js';

// Re-export UseCase factories
export { getPresetGeneratorUseCase, getSpaceCollectionUseCase, resetUseCases };

// Re-export types
export type { MonitorType };

// Custom Import Service (these use repository directly, will be migrated later)
export {
  deleteCustomCollection as deleteCustomCollectionById,
  importLayoutConfiguration,
  importLayoutConfigurationFromJson,
} from './custom-import-service.js';
// Re-export repository factory
export {
  getSpaceCollectionRepository,
  resetSpaceCollectionRepository,
} from './space-collection-repository.js';

// ============================================================================
// Backward-compatible wrapper functions
// These delegate to UseCase instances and will be deprecated in the future.
// ============================================================================

export function loadPresetCollections(): SpaceCollectionData[] {
  return getSpaceCollectionUseCase().loadPresetCollections();
}

export function savePresetCollections(collections: SpaceCollectionData[]): void {
  getSpaceCollectionUseCase().savePresetCollections(collections);
}

export function loadCustomCollections(): SpaceCollectionData[] {
  return getSpaceCollectionUseCase().loadCustomCollections();
}

export function saveCustomCollections(collections: SpaceCollectionData[]): void {
  getSpaceCollectionUseCase().saveCustomCollections(collections);
}

export function loadAllCollections(): SpaceCollectionData[] {
  return getSpaceCollectionUseCase().loadAllCollections();
}

export function addCustomCollection(
  collection: Omit<SpaceCollectionData, 'id'>
): SpaceCollectionData {
  return getSpaceCollectionUseCase().addCustomCollection(collection);
}

export function deleteCustomCollection(collectionId: string): boolean {
  return getSpaceCollectionUseCase().deleteCustomCollection(collectionId);
}

export function findCollectionById(collectionId: string): SpaceCollectionData | undefined {
  return getSpaceCollectionUseCase().findCollectionById(collectionId);
}

export function updateSpaceEnabled(
  collectionId: string,
  spaceId: string,
  enabled: boolean
): boolean {
  return getSpaceCollectionUseCase().updateSpaceEnabled(collectionId, spaceId, enabled);
}

export function getActiveSpaceCollection(activeId: string): SpaceCollectionData | undefined {
  return getSpaceCollectionUseCase().getActiveSpaceCollection(activeId);
}

export function resolveActiveSpaceCollectionId(activeId: string): string {
  return getSpaceCollectionUseCase().resolveActiveSpaceCollectionId(activeId);
}

export function hasPresetForMonitorCount(monitorCount: number, monitorType: MonitorType): boolean {
  return getPresetGeneratorUseCase().hasPresetForMonitorCount(monitorCount, monitorType);
}

export function ensurePresetForMonitorCount(monitorCount: number): void {
  getPresetGeneratorUseCase().ensurePresetForMonitorCount(monitorCount);
}

export function ensurePresetForCurrentMonitors(): void {
  getPresetGeneratorUseCase().ensurePresetForCurrentMonitors();
}
