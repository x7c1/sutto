/**
 * MainPanelState
 *
 * Manages the state of the main panel including cursor position,
 * panel position, dimensions, and current window information.
 */

import type { LayoutGroupCategory } from '../types';

export class MainPanelState {
  private categories: LayoutGroupCategory[] = [];
  private currentWmClass: string | null = null;
  private originalCursorX: number = 0;
  private originalCursorY: number = 0;
  private panelX: number = 0;
  private panelY: number = 0;
  private panelDimensions: { width: number; height: number } | null = null;

  /**
   * Get the current categories
   */
  getCategories(): LayoutGroupCategory[] {
    return this.categories;
  }

  /**
   * Set the categories
   */
  setCategories(categories: LayoutGroupCategory[]): void {
    this.categories = categories;
  }

  /**
   * Get the current window WM_CLASS
   */
  getCurrentWmClass(): string | null {
    return this.currentWmClass;
  }

  /**
   * Set the current window WM_CLASS
   */
  setCurrentWmClass(wmClass: string | null): void {
    this.currentWmClass = wmClass;
  }

  /**
   * Get the original cursor position (before adjustment)
   */
  getOriginalCursor(): { x: number; y: number } {
    return { x: this.originalCursorX, y: this.originalCursorY };
  }

  /**
   * Update the original cursor position
   */
  updateOriginalCursor(x: number, y: number): void {
    this.originalCursorX = x;
    this.originalCursorY = y;
  }

  /**
   * Get the adjusted panel position
   */
  getPanelPosition(): { x: number; y: number } {
    return { x: this.panelX, y: this.panelY };
  }

  /**
   * Update the panel position
   */
  updatePanelPosition(x: number, y: number): void {
    this.panelX = x;
    this.panelY = y;
  }

  /**
   * Get the panel dimensions
   */
  getPanelDimensions(): { width: number; height: number } | null {
    return this.panelDimensions;
  }

  /**
   * Set the panel dimensions
   */
  setPanelDimensions(dimensions: { width: number; height: number }): void {
    this.panelDimensions = dimensions;
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    this.originalCursorX = 0;
    this.originalCursorY = 0;
    this.panelX = 0;
    this.panelY = 0;
    this.panelDimensions = null;
    // Note: Keep currentWmClass and categories to preserve across panel reopens
  }
}
