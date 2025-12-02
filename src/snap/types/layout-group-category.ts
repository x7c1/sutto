import type { LayoutGroup } from './layout-group';

export interface LayoutGroupCategory {
  name: string; // Category name (e.g., "Vertical Divisions")
  layoutGroups: LayoutGroup[]; // Array of layout groups (displays) in this category
}
