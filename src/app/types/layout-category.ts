import type { DisplayGroup } from './display-group.js';

// LayoutCategory: Runtime type for categories with Display Groups
export interface LayoutCategory {
  name: string;
  displayGroups: DisplayGroup[];
}
