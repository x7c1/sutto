/**
 * MainPanelState
 *
 * Manages the state of the main panel including cursor position,
 * panel position, dimensions, and current window information.
 */

import type Meta from 'gi://Meta';
import type { LayoutCategory, Position, Size } from '../types/index.js';

declare function log(message: string): void;

export class MainPanelState {
  private categories: LayoutCategory[] = [];
  private currentWindow: Meta.Window | null = null;
  private originalCursorX: number = 0;
  private originalCursorY: number = 0;
  private panelX: number = 0;
  private panelY: number = 0;
  private panelDimensions: Size | null = null;

  /**
   * Get the current categories
   */
  getCategories(): LayoutCategory[] {
    return this.categories;
  }

  /**
   * Set the categories
   */
  setCategories(categories: LayoutCategory[]): void {
    // Defensive check: validate all categories have displayGroups
    const validCategories = categories.filter((category) => {
      if (!category.displayGroups || !Array.isArray(category.displayGroups)) {
        log(
          `[MainPanelState] WARNING: Invalid category detected (missing displayGroups), filtering out: ${category.name}`
        );
        return false;
      }
      return true;
    });

    this.categories = validCategories;
  }

  /**
   * Get the current window
   */
  getCurrentWindow(): Meta.Window | null {
    return this.currentWindow;
  }

  /**
   * Set the current window
   */
  setCurrentWindow(window: Meta.Window | null): void {
    this.currentWindow = window;
  }

  /**
   * Get the original cursor position (before adjustment)
   */
  getOriginalCursor(): Position {
    return { x: this.originalCursorX, y: this.originalCursorY };
  }

  /**
   * Update the original cursor position
   */
  updateOriginalCursor(position: Position): void {
    this.originalCursorX = position.x;
    this.originalCursorY = position.y;
  }

  /**
   * Get the adjusted panel position
   */
  getPanelPosition(): Position {
    return { x: this.panelX, y: this.panelY };
  }

  /**
   * Update the panel position
   */
  updatePanelPosition(position: Position): void {
    this.panelX = position.x;
    this.panelY = position.y;
  }

  /**
   * Get the panel dimensions
   */
  getPanelDimensions(): Size | null {
    return this.panelDimensions;
  }

  /**
   * Set the panel dimensions
   */
  setPanelDimensions(dimensions: Size): void {
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
    // Note: Keep currentWindow and categories to preserve across panel reopens
  }
}
