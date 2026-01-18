import type { SpacesRow } from './spaces-row.js';

// SpaceCollection: A container holding multiple SpacesRows
// Users can maintain multiple collections (e.g., "Work", "Home", "Single Monitor")
// and switch between them. Only one collection is active at a time.
export interface SpaceCollection {
  id: string;
  name: string;
  rows: SpacesRow[];
}
