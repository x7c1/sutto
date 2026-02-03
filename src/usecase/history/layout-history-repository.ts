import type { CollectionId, LayoutId } from '../../domain/layout/index.js';

/**
 * Interface for layout history persistence
 * Infrastructure layer implements this interface with file-based storage
 */
export interface LayoutHistoryRepository {
  /**
   * Set the active collection for history lookups
   */
  setActiveCollection(collectionId: CollectionId): void;

  /**
   * Load history from storage
   */
  load(): void;

  /**
   * Record a layout selection for a window
   */
  setSelectedLayout(windowId: number, wmClass: string, title: string, layoutId: LayoutId): void;

  /**
   * Get the previously selected layout for a window
   * Returns null if no history exists
   */
  getSelectedLayoutId(windowId: number, wmClass: string, title: string): LayoutId | null;
}
