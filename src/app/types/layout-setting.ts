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

// Display Group Setting - defines Layout Group assignment per monitor (for import input)
export interface DisplayGroupSetting {
  displays: {
    [monitorKey: string]: string; // "0" -> "vertical 3-split" (Layout Group name)
  };
}

// Layout Category with Display Groups (for import input)
export interface LayoutCategoryWithDisplayGroups {
  name: string;
  displayGroups: DisplayGroupSetting[];
}

// Complete layout configuration structure (for import input)
export interface LayoutConfiguration {
  layoutGroups: LayoutGroupSetting[]; // Global, reusable Layout Groups
  layoutCategories: LayoutCategoryWithDisplayGroups[]; // Categories with Display Groups
}
