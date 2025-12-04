/**
 * SnapMenuState
 *
 * Manages the state of the snap menu including cursor position,
 * menu position, dimensions, and current window information.
 */

import type { LayoutGroupCategory } from './types';

export class SnapMenuState {
  private categories: LayoutGroupCategory[] = [];
  private currentWmClass: string | null = null;
  private originalCursorX: number = 0;
  private originalCursorY: number = 0;
  private menuX: number = 0;
  private menuY: number = 0;
  private menuDimensions: { width: number; height: number } | null = null;

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
   * Get the adjusted menu position
   */
  getMenuPosition(): { x: number; y: number } {
    return { x: this.menuX, y: this.menuY };
  }

  /**
   * Update the menu position
   */
  updateMenuPosition(x: number, y: number): void {
    this.menuX = x;
    this.menuY = y;
  }

  /**
   * Get the menu dimensions
   */
  getMenuDimensions(): { width: number; height: number } | null {
    return this.menuDimensions;
  }

  /**
   * Set the menu dimensions
   */
  setMenuDimensions(dimensions: { width: number; height: number }): void {
    this.menuDimensions = dimensions;
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    this.originalCursorX = 0;
    this.originalCursorY = 0;
    this.menuX = 0;
    this.menuY = 0;
    this.menuDimensions = null;
    // Note: Keep currentWmClass and categories to preserve across menu reopens
  }
}
