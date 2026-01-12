import type { LayoutGroup } from './layout-group.js';

// DisplayGroup: Runtime type (WITH id/hash in all layouts)
export interface DisplayGroup {
  id: string; // Unique ID for this Display Group
  displays: {
    [monitorKey: string]: LayoutGroup; // "0" -> LayoutGroup object (with id and layouts with id/hash)
  };
}
