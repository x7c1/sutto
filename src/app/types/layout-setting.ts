// Configuration layer - settings definitions (no runtime IDs)
export interface LayoutSetting {
  label: string;
  x: string; // expression: '1/3', '50%', '100px', '50% - 10px', etc.
  y: string; // expression: '0', '50%', '10px', etc.
  width: string; // expression: '1/3', '300px', '100% - 20px', etc.
  height: string; // expression: '100%', '1/2', '500px', etc.
}

export interface LayoutGroupSetting {
  name: string;
  layouts: LayoutSetting[];
}

// Space Setting - defines Layout Group assignment per monitor (for import input)
export interface SpaceSetting {
  displays: {
    [monitorKey: string]: string; // "0" -> "vertical 3-split" (Layout Group name)
  };
}

// Spaces Row with Spaces (for import input)
export interface SpacesRowSetting {
  spaces: SpaceSetting[];
}

// Complete layout configuration structure (for import input)
export interface LayoutConfiguration {
  layoutGroups: LayoutGroupSetting[]; // Global, reusable Layout Groups
  rows: SpacesRowSetting[]; // Rows of Spaces
}
