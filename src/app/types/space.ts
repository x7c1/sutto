import type { LayoutGroup } from './layout-group.js';

// Space: Runtime type (WITH id/hash in all layouts)
export interface Space {
  id: string; // Unique ID for this Space
  displays: {
    [monitorKey: string]: LayoutGroup; // "0" -> LayoutGroup object (with id and layouts with id/hash)
  };
}
