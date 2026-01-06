# Multi-Monitor Support Implementation Plan

## Overview

Add comprehensive multi-monitor support to Snappa GNOME Shell extension, enabling users to:
- View layouts for all monitors simultaneously in their physical 2D arrangement
- Create **Display Groups** that define which Layout Group appears on which monitor
- Support multiple Display Group patterns within a Category (e.g., "both same" vs "different per monitor")
- Track layout selection history per monitor
- Support different monitor resolutions and aspect ratios

**Key Concept - Display Groups:**
A Display Group is a mapping of monitors to Layout Groups. For example, in a 2-monitor setup:
- Display Group "Both 2x2": Monitor 0 → "grid 2x2" layouts, Monitor 1 → "grid 2x2" layouts
- Display Group "Mixed": Monitor 0 → "grid 2x2" layouts, Monitor 1 → "grid 3x3" layouts

Each Display Group contains fully expanded Layout Groups for each monitor, with unique IDs for all layouts to enable per-monitor selection history tracking.

## User Requirements

- **Display**: Show all monitors' layouts simultaneously in their physical 2D arrangement
- **Management**: Each monitor can have different Layout Groups assigned via Display Groups
- **Configuration**: Create Display Groups that define which Layout Group appears on which monitor
- **Flexibility**: Same Layout Group can be used on multiple monitors, or different groups per monitor

Example: User creating custom layout configuration (input format for import)

**Note**: Monitor keys use 0-based indexing ("0", "1") matching the internal API, while UI displays user-friendly labels ("Monitor 1", "Monitor 2").

Users define global Layout Groups once, then reference them by name in Display Groups:

**Complete input format example:**
```json
{
  "layoutGroups": [
    {
      "name": "vertical 2-split",
      "layouts": [
        {"label": "Left Half", "x": "0", "y": "0", "width": "50%", "height": "100%"},
        {"label": "Right Half", "x": "50%", "y": "0", "width": "50%", "height": "100%"}
      ]
    },
    {
      "name": "vertical 3-split",
      "layouts": [
        {"label": "Left Third", "x": "0", "y": "0", "width": "1/3", "height": "100%"},
        {"label": "Center Third", "x": "1/3", "y": "0", "width": "1/3", "height": "100%"},
        {"label": "Right Third", "x": "2/3", "y": "0", "width": "1/3", "height": "100%"}
      ]
    },
    {
      "name": "grid 2x2",
      "layouts": [
        {"label": "Top Left", "x": "0", "y": "0", "width": "50%", "height": "50%"},
        {"label": "Top Right", "x": "50%", "y": "0", "width": "50%", "height": "50%"},
        {"label": "Bottom Left", "x": "0", "y": "50%", "width": "50%", "height": "50%"},
        {"label": "Bottom Right", "x": "50%", "y": "50%", "width": "50%", "height": "50%"}
      ]
    }
  ],
  "layoutCategories": [
    {
      "name": "Vertical Division Patterns",
      "displayGroups": [
        {
          "name": "Browsing (both monitors)",
          "displays": {
            "0": "vertical 3-split",
            "1": "vertical 3-split"
          }
        },
        {
          "name": "Coding (editor + terminal)",
          "displays": {
            "0": "vertical 2-split",
            "1": "vertical 3-split"
          }
        }
      ]
    },
    {
      "name": "Grid Patterns",
      "displayGroups": [
        {
          "name": "Both monitors 2x2",
          "displays": {
            "0": "grid 2x2",
            "1": "grid 2x2"
          }
        }
      ]
    }
  ]
}
```

**Key points:**
- **layoutGroups**: Global definitions of Layout Groups (defined once, reused by name)
- **layoutCategories**: Categories containing Display Groups
- **displayGroups**: Map monitor keys to Layout Group names (e.g., "0": "vertical 3-split")
- When Snappa imports this, it resolves Layout Group names, expands them, and generates unique IDs for Display Groups, Layout Groups, and all Layouts
- The runtime format stored in `imported-layouts.json` has fully expanded Layout Groups with IDs (see Storage Changes section)

## Architecture Changes

### New Type Definitions

Create `src/app/types/monitor-config.ts`:

```typescript
export interface MonitorInfo {
  index: number;  // 0-based monitor index ("0", "1", "2"...)
  geometry: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface PerMonitorLayoutHistory {
  version: 2;
  byMonitor: {
    [monitorKey: string]: {  // monitorKey: "0", "1", "2"...
      byWindowId: { [windowId: number]: string };
      byWmClass: { [wmClass: string]: string[] };
      byWmClassAndLabel: { [key: string]: string };
    };
  };
}

/**
 * Note: Version 2 format is required for per-monitor history.
 * During development, delete existing layout-history.json before implementation.
 */
```

Update `src/app/types/layout-setting.ts`:

```typescript
// LayoutSetting: Configuration data WITHOUT id/hash (used for import input)
export interface LayoutSetting {
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
}

export interface LayoutGroupSetting {
  name: string;
  layouts: LayoutSetting[];
}

// NEW: Display Group Setting - defines Layout Group assignment per monitor (for import input)
export interface DisplayGroupSetting {
  name: string;
  displays: {
    [monitorKey: string]: string; // "0" -> "vertical 3-split" (Layout Group name)
  };
}

export interface LayoutCategorySetting {
  name: string;
  displayGroups: DisplayGroupSetting[];
}

// NEW: Global structure with separated Layout Groups (for import input)
export interface GlobalLayoutSettings {
  layoutGroups: LayoutGroupSetting[]; // Global, reusable Layout Groups
  layoutCategories: LayoutCategorySetting[]; // Categories with Display Groups
}
```

**Important distinction:**
- `LayoutSetting` types (above) are used for **import input only** (no id/hash)
- `imported-layouts.json` stores runtime types with id/hash generated at import time
- When Snappa imports settings, it converts `LayoutSetting` → `Layout` by adding id/hash
- Similarly, it converts `LayoutGroupSetting` → `LayoutGroup` by adding id to the group and id/hash to each layout

Create new runtime types in `src/app/types/display-group.ts`:

```typescript
import type { LayoutGroup } from './layout.js';

// DisplayGroup: Runtime type (WITH id/hash in all layouts)
export interface DisplayGroup {
  id: string;  // Unique ID for this Display Group
  name: string;
  displays: {
    [monitorKey: string]: LayoutGroup; // "0" -> LayoutGroup object (with id and layouts with id/hash)
  };
}
```

Create new runtime types in `src/app/types/layout-category.ts`:

```typescript
import type { DisplayGroup } from './display-group.js';

// LayoutCategory: Runtime type for categories with Display Groups
export interface LayoutCategory {
  name: string;
  displayGroups: DisplayGroup[];
}
```

**Note on type structure:**
- Each `DisplayGroup` has a unique `id` for the group itself
- Each `LayoutGroup` within a `DisplayGroup` has a unique `id`
- Each `Layout` within a `LayoutGroup` has both `id` and `hash`
- This ensures all layouts across all monitors have unique IDs for selection history tracking

### New Monitor Manager

Create `src/app/monitor/manager.ts`:

Key responsibilities:
- Detect all connected monitors using `global.display.get_n_monitors()`
- Create MonitorInfo for each monitor (index, geometry, work area, isPrimary)
- Track monitor configuration changes via `monitors-changed` signal
- Provide monitor lookup by position (for cursor-based detection)
- Provide monitor lookup by window (which monitor a window is on)

Critical methods:
```typescript
class MonitorManager {
  detectMonitors(): Map<string, MonitorInfo>
  getMonitorByKey(monitorKey: string): MonitorInfo | null  // Lookup by "0", "1", etc.
  getMonitorAtPosition(x, y): MonitorInfo | null
  getMonitorForWindow(window): MonitorInfo | null
  connectToMonitorChanges(display): void
  calculateBoundingBox(monitors: MonitorInfo[]): BoundingBox
}
```

The `calculateBoundingBox` method computes the bounding box that contains all monitors:
- Finds minimum X and Y coordinates across all monitors
- Finds maximum X and Y coordinates (x + width, y + height)
- Returns the overall dimensions for scaling the 2D layout

### Storage Changes

**Modify: `imported-layouts.json`** (extension data directory)

**Breaking change:** The file structure changes from `LayoutGroupCategory[]` to a new global structure.

**Old structure (current):**
```json
[
  {
    "name": "Category Name",
    "layoutGroups": [...]
  }
]
```

**New structure with Display Groups containing expanded Layout Groups:**

```json
[
  {
    "name": "Vertical Division Patterns",
    "displayGroups": [
      {
        "id": "dg-uuid-1",
        "name": "Browsing (both monitors)",
        "displays": {
          "0": {
            "id": "lg-uuid-1",
            "name": "vertical 3-split",
            "layouts": [
              {"id": "layout-uuid-1", "hash": "hash-1", "label": "Left Third", "x": "0", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-2", "hash": "hash-2", "label": "Center Third", "x": "1/3", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-3", "hash": "hash-3", "label": "Right Third", "x": "2/3", "y": "0", "width": "1/3", "height": "100%"}
            ]
          },
          "1": {
            "id": "lg-uuid-2",
            "name": "vertical 3-split",
            "layouts": [
              {"id": "layout-uuid-4", "hash": "hash-4", "label": "Left Third", "x": "0", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-5", "hash": "hash-5", "label": "Center Third", "x": "1/3", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-6", "hash": "hash-6", "label": "Right Third", "x": "2/3", "y": "0", "width": "1/3", "height": "100%"}
            ]
          }
        }
      },
      {
        "id": "dg-uuid-2",
        "name": "Coding (editor + terminal)",
        "displays": {
          "0": {
            "id": "lg-uuid-3",
            "name": "vertical 2-split",
            "layouts": [
              {"id": "layout-uuid-7", "hash": "hash-7", "label": "Left Half", "x": "0", "y": "0", "width": "50%", "height": "100%"},
              {"id": "layout-uuid-8", "hash": "hash-8", "label": "Right Half", "x": "50%", "y": "0", "width": "50%", "height": "100%"}
            ]
          },
          "1": {
            "id": "lg-uuid-4",
            "name": "vertical 3-split",
            "layouts": [
              {"id": "layout-uuid-9", "hash": "hash-9", "label": "Left Third", "x": "0", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-10", "hash": "hash-10", "label": "Center Third", "x": "1/3", "y": "0", "width": "1/3", "height": "100%"},
              {"id": "layout-uuid-11", "hash": "hash-11", "label": "Right Third", "x": "2/3", "y": "0", "width": "1/3", "height": "100%"}
            ]
          }
        }
      }
    ]
  },
  {
    "name": "Grid Patterns",
    "displayGroups": [
      {
        "id": "dg-uuid-3",
        "name": "Both monitors 2x2",
        "displays": {
          "0": {
            "id": "lg-uuid-5",
            "name": "grid 2x2",
            "layouts": [
              {"id": "layout-uuid-12", "hash": "hash-12", "label": "Top Left", "x": "0", "y": "0", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-13", "hash": "hash-13", "label": "Top Right", "x": "50%", "y": "0", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-14", "hash": "hash-14", "label": "Bottom Left", "x": "0", "y": "50%", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-15", "hash": "hash-15", "label": "Bottom Right", "x": "50%", "y": "50%", "width": "50%", "height": "50%"}
            ]
          },
          "1": {
            "id": "lg-uuid-6",
            "name": "grid 2x2",
            "layouts": [
              {"id": "layout-uuid-16", "hash": "hash-16", "label": "Top Left", "x": "0", "y": "0", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-17", "hash": "hash-17", "label": "Top Right", "x": "50%", "y": "0", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-18", "hash": "hash-18", "label": "Bottom Left", "x": "0", "y": "50%", "width": "50%", "height": "50%"},
              {"id": "layout-uuid-19", "hash": "hash-19", "label": "Bottom Right", "x": "50%", "y": "50%", "width": "50%", "height": "50%"}
            ]
          }
        }
      }
    ]
  }
]
```

**Key changes:**
- Structure is now `LayoutCategory[]` (array of categories)
- Each **DisplayGroup** has a unique `id` and contains fully expanded **LayoutGroup** objects
- Each **LayoutGroup** within a DisplayGroup has a unique `id`
- Each **Layout** has both `id` and `hash` for selection history tracking
- Layout Groups are NOT shared - each monitor in each Display Group has its own LayoutGroup instance with unique IDs
- This ensures all layouts across all monitors and Display Groups have globally unique IDs

**New: `layout-history.json`** (per-monitor history tracking)
```json
{
  "version": 2,
  "byMonitor": {
    "0": {
      "byWindowId": {},
      "byWmClass": { "firefox": ["layout-uuid-1"] },
      "byWmClassAndLabel": {}
    },
    "1": {
      "byWindowId": {},
      "byWmClass": { "code": ["layout-uuid-9"] },
      "byWmClassAndLabel": {}
    }
  }
}
```

### UI Rendering Changes

**New file: `src/app/ui/monitor-section.ts`**

Creates a monitor section that displays the assigned Layout Group for one monitor.
A "Monitor Section" is a miniature display with a header showing monitor information (e.g., "Monitor 1 (Primary) - 1920x1080"):
```typescript
function createMonitorSectionView(
  monitorInfo: MonitorInfo,
  layoutGroup: LayoutGroup,  // The Layout Group assigned to this monitor
  displayWidth: number,
  displayHeight: number,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): MonitorSectionView
```

Visual structure:
```
Monitor Section Container (vertical, for each monitor)
├── Monitor Header Label ("Monitor 1 (Primary) - 1920x1080")
│   Note: Display as "Monitor {index+1}" for user-friendly labeling
└── Miniature Display (showing layout buttons from assigned Layout Group)
    ├── Layout Button 1
    ├── Layout Button 2
    └── Layout Button 3

Overall Panel Container (vertical layout for Display Groups)
├── Display Group Section (with Clutter.FixedLayout for 2D monitor positioning)
│   ├── Monitor Section 0 (positioned at scaled x, y via set_position())
│   └── Monitor Section 1 (positioned at scaled x, y via set_position())
└── (Next Display Group Section...)
```

Each Display Group section uses `Clutter.FixedLayout()` as the layout manager (similar to existing miniature display implementation) and `set_position()` to replicate the physical 2D layout of monitors.

**New file: `src/app/ui/display-group-section.ts`**

Creates a Display Group section that displays all monitors in their physical 2D arrangement:
```typescript
function createDisplayGroupSectionView(
  displayGroup: DisplayGroup,
  monitors: Map<string, MonitorInfo>,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): DisplayGroupSectionView
```

**Implementation details:**
- Creates `St.Widget` with `Clutter.FixedLayout()` for absolute positioning
- Iterates through `displayGroup.displays` entries
- For each monitor key, creates a monitor section view using `createMonitorSectionView()`
- Calculates bounding box from all monitors in the Display Group
- Calculates scale factor to fit in panel constraints
- Positions each monitor section at scaled coordinates using `set_position()`
- Handles missing monitors by displaying error message (see Error Handling section)

**Modify: `src/app/main-panel/renderer.ts`**

Replace `createCategoriesView` with a multi-monitor version:
```typescript
function createCategoriesView(
  monitors: Map<string, MonitorInfo>,
  categories: LayoutCategory[],  // Categories with Display Groups
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): CategoriesView
```

**Key implementation notes:**
- Replace existing `createCategoriesView` completely (single-monitor is NOT a special case - all code uses Display Groups)
- For each Category, iterate through its Display Groups
- Call `createDisplayGroupSectionView()` from `display-group-section.ts` for each Display Group
- Stack Display Group sections vertically within the category

Implementation steps (for `display-group-section.ts`):

**For each Display Group:**
1. **Calculate bounding box**: Get the overall dimensions of all monitors referenced in this Display Group
2. **Calculate scale factor**: Determine how much to scale down to fit in panel
   - `scale = MAX_PANEL_WIDTH / boundingBox.width`
   - Or `scale = MAX_PANEL_HEIGHT / boundingBox.height`
   - Use the smaller scale to fit both dimensions
3. **Create absolute positioning container**: Use `St.Widget` with `Clutter.FixedLayout()` that supports child positioning
4. **For each [monitorKey, layoutGroup] in displayGroup.displays**:
   - Get MonitorInfo for this monitor key from monitors Map
   - If monitor not found, create error indicator (see Error Handling section)
   - Calculate monitor section dimensions (scaled monitor width/height)
   - Calculate position: `scaledX = (monitor.x - bbox.minX) * scale`, `scaledY = (monitor.y - bbox.minY) * scale`
   - Create monitor section view with the Layout Group using `createMonitorSectionView()`
   - Set position using `section.set_position(scaledX, scaledY)`
   - Add to absolute positioning container
5. Return the Display Group container

This creates a structure where:
- Each **Category** contains multiple **Display Group** sections (assembled in `renderer.ts`)
- Each **Display Group** section shows a 2D spatial layout of monitors (created in `display-group-section.ts`)
- Each **Monitor section** displays the assigned Layout Group's miniature display (created in `monitor-section.ts`)

**Miniature Display Sizing:**

Each monitor section is scaled proportionally based on the bounding box scale factor:
- `scaledWidth = monitor.workArea.width * scale`
- `scaledHeight = monitor.workArea.height * scale`

This preserves:
- The aspect ratio of each monitor
- The relative size differences between monitors (e.g., a 2560x1440 monitor appears larger than 1920x1080)
- The spatial relationships between monitors

The miniature displays within each monitor section use these scaled dimensions for layout calculations.

### Layout Selection and Application

**Modify: `src/app/controller.ts`**

Current method:
```typescript
private applyLayoutToCurrentWindow(layout: Layout): void
```

New signature:
```typescript
private applyLayoutToCurrentWindow(layout: Layout, monitorKey: string): void
```

Key changes:
- Receive monitorKey parameter from layout selection callback
- Look up MonitorInfo for that monitorKey
- Use monitor-specific work area for expression evaluation
- Record selection in per-monitor history: `setSelectedLayoutForMonitor(monitorKey, ...)`

Layout expression evaluation:
```typescript
const monitorInfo = this.monitorManager.getMonitorByKey(monitorKey);
const workArea = monitorInfo.workArea;
const x = workArea.x + resolve(layout.x, workArea.width);
const y = workArea.y + resolve(layout.y, workArea.height);
// ... apply to window
```

**Modify: `src/app/repository/layout-history.ts`**

Add new functions for per-monitor history:
```typescript
export function setSelectedLayoutForMonitor(
  monitorKey: string,
  windowId: number,
  wmClass: string,
  title: string,
  layoutId: string
): void

export function getSelectedLayoutIdForMonitor(
  monitorKey: string,
  windowId: number,
  wmClass: string,
  title: string
): string | null
```

Key changes:
- All history tracking now uses per-monitor storage in `byMonitor[monitorKey]`
- No backward compatibility needed (see Pre-Implementation: Data Cleanup section)

### Repository Changes

**Modify: `src/app/repository/layouts.ts`**

Update to handle new Display Group structure:

```typescript
// Load layouts (returns LayoutCategory[] with expanded Display Groups)
export function loadLayouts(): LayoutCategory[]

// Save layouts with new structure
function saveLayouts(categories: LayoutCategory[]): void

// Import settings and convert to runtime format
export function importSettings(settings: GlobalLayoutSettings): void
```

Key changes:
- **loadLayouts()** now returns `LayoutCategory[]` (array of categories with Display Groups)
- Display Groups contain fully expanded Layout Groups with unique IDs
- **importSettings()** accepts `GlobalLayoutSettings` (with global layoutGroups and layoutCategories)
- Import process:
  1. Read global layoutGroups array
  2. For each DisplayGroup in each Category:
     - Resolve Layout Group names to their definitions
     - Generate unique ID for the DisplayGroup
     - Generate unique ID for each LayoutGroup (separate instance per monitor)
     - Generate unique ID and hash for each Layout
  3. Save to `imported-layouts.json` in runtime format (LayoutCategory[] with expanded Display Groups)

### Constants Updates

**Modify: `src/app/constants.ts`**

Add new constants:
```typescript
export const MAX_PANEL_WIDTH = 800; // Maximum width for multi-monitor panel layout
export const MAX_PANEL_HEIGHT = 600; // Maximum height for multi-monitor panel layout
export const DISPLAY_GROUP_SPACING = 16; // Vertical spacing between Display Group sections
```

**Update DEFAULT_LAYOUT_SETTINGS structure:**

Change from `LayoutCategorySetting[]` to `GlobalLayoutSettings`:

```typescript
export const DEFAULT_LAYOUT_SETTINGS: GlobalLayoutSettings = {
  layoutGroups: [
    {
      name: 'vertical 2-split',
      layouts: [
        { label: 'Left Half', x: '0', y: '0', width: '50%', height: '100%' },
        { label: 'Right Half', x: '50%', y: '0', width: '50%', height: '100%' }
      ]
    },
    {
      name: 'vertical 3-split',
      layouts: [
        { label: 'Left Third', x: '0', y: '0', width: '1/3', height: '100%' },
        { label: 'Center Third', x: '1/3', y: '0', width: '1/3', height: '100%' },
        { label: 'Right Third', x: '2/3', y: '0', width: '1/3', height: '100%' }
      ]
    },
    // ... all other layout groups
  ],
  layoutCategories: [
    {
      name: 'Vertical Division Patterns',
      displayGroups: [
        {
          name: 'Browsing (both monitors)',
          displays: {
            '0': 'vertical 3-split',
            '1': 'vertical 3-split'
          }
        },
        {
          name: 'Coding (editor + terminal)',
          displays: {
            '0': 'vertical 2-split',
            '1': 'vertical 3-split'
          }
        }
      ]
    },
    // ... all other categories with display groups for monitors 0 and 1
  ]
};
```

This structure:
- Separates reusable Layout Groups from their Display Group assignments
- Defaults to dual monitor setup (monitors "0" and "1")
- Single monitor systems will simply have one monitor section displayed
- Users can manually edit `imported-layouts.json` to customize Display Groups

## Implementation Steps

### Phase 1: Foundation (Monitor Detection)
- Create `src/app/types/monitor-config.ts` with type definitions
- Create `src/app/monitor/manager.ts` with MonitorManager class
- Modify `src/app/controller.ts`:
  - Initialize MonitorManager in constructor
  - Call `detectMonitors()` in `enable()`
  - Connect to `monitors-changed` signal
- Test: Log detected monitors and their properties

### Phase 2: Data Structure Refactoring
- **BEFORE STARTING**: Delete existing data files (see "Pre-Implementation: Data Cleanup" section)
- Update `src/app/types/layout-setting.ts`:
  - Add `DisplayGroupSetting` interface
  - Add `GlobalLayoutSettings` interface
  - Update `LayoutCategorySetting` to use `displayGroups`
- Modify `src/app/constants.ts`:
  - Change `DEFAULT_LAYOUT_SETTINGS` from `LayoutCategorySetting[]` to `GlobalLayoutSettings`
  - Separate Layout Groups into global array
  - Create Display Groups with monitors "0" and "1" for dual-monitor setup by default
- Modify `src/app/repository/layouts.ts`:
  - Update `loadLayouts()` to return `LayoutCategory[]` (with expanded Display Groups)
  - Update `saveLayouts()` to save `LayoutCategory[]` structure
  - Update `importSettings()` to accept `GlobalLayoutSettings` and expand Layout Group names
- Modify `src/app/repository/layout-history.ts`:
  - Add per-monitor history functions (with version 2 structure)
  - Update `setSelectedLayout` to work with new structure
  - Update `getSelectedLayoutId` to work with new structure
- Test: Verify data loads correctly with new structure

### Phase 3: UI Rendering
- Create `src/app/ui/monitor-section.ts`
- Implement `createMonitorSectionView()` function (takes MonitorInfo and assigned LayoutGroup)
- Create `src/app/ui/display-group-section.ts`
- Implement `createDisplayGroupSectionView()` function:
  - Takes DisplayGroup (with expanded LayoutGroups), MonitorManager
  - Creates 2D spatial layout of monitor sections
  - Uses absolute positioning for monitors
- Modify `src/app/main-panel/renderer.ts`:
  - Replace `createCategoriesView()` with multi-monitor version:
    - Update signature to accept monitors and categories (with DisplayGroups containing expanded LayoutGroups)
    - Iterate through categories
    - For each category, iterate through Display Groups
    - Call `createDisplayGroupSectionView()` to create 2D monitor layout
    - Stack Display Groups vertically
  - Note: Single-monitor is NOT a special case - all systems use Display Groups
- Modify `src/app/main-panel/index.ts`:
  - Pass MonitorManager to renderer
  - Update panel creation to use new structure
- Test: Verify Display Group sections render correctly with physical 2D layout preserved

### Phase 4: Layout Application
- Modify `src/app/controller.ts`:
  - Update `applyLayoutToCurrentWindow` signature to accept monitorKey
  - Use monitor-specific work area for layout calculations
  - Update callback in MainPanel.setOnLayoutSelected
- Modify `src/app/ui/monitor-section.ts`:
  - Pass monitorKey to layout selection callback
- Test: Verify layouts are applied to correct monitor with correct work area

### Phase 5: Per-Monitor History
- Modify `src/app/repository/layout-history.ts`:
  - Implement `setSelectedLayoutForMonitor`
  - Implement `getSelectedLayoutIdForMonitor`
  - Update load/save to handle version 2 format
- Modify `src/app/controller.ts`:
  - Use per-monitor history functions
- Modify `src/app/ui/layout-button.ts`:
  - Update button highlighting to use per-monitor history
- Test: Verify history is tracked separately per monitor

### Phase 6: Error Handling for Missing Monitors

**Strategy: Option B - Display error indicator in monitor section**

When a Display Group references a monitor that doesn't exist (e.g., monitor "1" disconnected), display an error indicator in place of the monitor section.

**Implementation in `src/app/ui/display-group-section.ts`:**

```typescript
function createDisplayGroupSectionView(
  displayGroup: DisplayGroup,
  monitors: Map<string, MonitorInfo>,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): DisplayGroupSectionView {
  // ... create container with FixedLayout ...

  for (const [monitorKey, layoutGroup] of Object.entries(displayGroup.displays)) {
    const monitorInfo = monitors.get(monitorKey);

    if (!monitorInfo) {
      // Monitor not found - create error indicator
      const errorSection = createMonitorErrorSection(
        monitorKey,
        scaledWidth,  // Use expected dimensions for layout consistency
        scaledHeight
      );
      errorSection.set_position(scaledX, scaledY);
      container.add_child(errorSection);
      continue;
    }

    // Normal monitor section creation...
  }
}
```

**Create error section view:**

```typescript
function createMonitorErrorSection(
  monitorKey: string,
  width: number,
  height: number
): St.Widget {
  const container = new St.BoxLayout({
    vertical: true,
    style_class: 'monitor-section-error',
    width: width,
    height: height
  });

  const header = new St.Label({
    text: `Monitor ${parseInt(monitorKey) + 1}`,
    style_class: 'monitor-section-header'
  });

  const errorBox = new St.BoxLayout({
    vertical: true,
    x_align: Clutter.ActorAlign.CENTER,
    y_align: Clutter.ActorAlign.CENTER,
    style_class: 'monitor-error-box'
  });

  const errorIcon = new St.Icon({
    icon_name: 'dialog-warning-symbolic',
    icon_size: 24,
    style_class: 'monitor-error-icon'
  });

  const errorLabel = new St.Label({
    text: 'Not Connected',
    style_class: 'monitor-error-label'
  });

  errorBox.add_child(errorIcon);
  errorBox.add_child(errorLabel);

  container.add_child(header);
  container.add_child(errorBox);

  return container;
}
```

**Visual appearance:**

```
┌─ Monitor 0 ─────────┐  ┌─ Monitor 1 ──────────┐
│ [Normal layouts]    │  │  ⚠️                   │
│                     │  │  Not Connected       │
└─────────────────────┘  └──────────────────────┘
```

**Testing:**
- Test edge case: Display Group references monitor "1" but only monitor "0" exists
- Verify error section displays correctly
- Verify no crashes or layout issues

### Phase 7: Additional Edge Cases
- Handle monitor disconnect/reconnect gracefully (re-render panel)
- Handle primary monitor changes
- Handle resolution changes (trigger monitors-changed signal, re-render)
- Handle missing Layout Group names during import (validation error)
- Test: All edge case scenarios

### Phase 8: Polish & Documentation
- Add debug logging for monitor operations
- Update README.md with multi-monitor features
- Add inline code documentation
- Performance testing with 3+ monitors
- Final integration testing

## Critical Files to Modify

### New Files
- `src/app/types/monitor-config.ts` - Type definitions for monitors
- `src/app/types/display-group.ts` - DisplayGroup runtime type definition
- `src/app/types/layout-category.ts` - LayoutCategory runtime type definition
- `src/app/monitor/manager.ts` - Monitor detection and management
- `src/app/ui/monitor-section.ts` - Monitor section UI component
- `src/app/ui/display-group-section.ts` - Display Group section UI component (2D monitor layout)

### Modified Files
- `src/app/types/layout-setting.ts` - Add DisplayGroupSetting, GlobalLayoutSettings
- `src/app/constants.ts` - Update DEFAULT_LAYOUT_SETTINGS to GlobalLayoutSettings structure, add MAX_PANEL_WIDTH/HEIGHT
- `src/app/repository/layouts.ts` - Import GlobalLayoutSettings, expand Layout Groups, save LayoutCategory[] runtime format
- `src/app/repository/layout-history.ts` - Per-monitor history support (version 2)
- `src/app/controller.ts` - Integrate MonitorManager, update layout application with monitorKey
- `src/app/main-panel/index.ts` - Pass MonitorManager to renderer
- `src/app/main-panel/renderer.ts` - Multi-monitor rendering with Display Groups (expanded LayoutGroups)
- `src/app/ui/layout-button.ts` - Per-monitor history highlighting
- `src/app/types/index.ts` - Export new types (DisplayGroup, LayoutCategory, MonitorInfo, etc.)

## Pre-Implementation: Data Cleanup

**IMPORTANT**: Before implementing this feature, the following files must be deleted or reinitialized to work with the new Display Group structure.

### Files to Delete

Delete all existing data files in the extension data directory (`~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/`):

```bash
rm ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/imported-layouts.json
rm ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/layout-history.json
```

### What Happens After Deletion

1. **imported-layouts.json**: Will be recreated from `DEFAULT_LAYOUT_SETTINGS` with new Display Group structure on next extension enable
2. **layout-history.json**: Will be recreated with version 2 structure (with `byMonitor` sections) when first layout is selected

### Single Monitor Behavior

- Default Display Groups in `DEFAULT_LAYOUT_SETTINGS` assign Layout Groups to monitors "0" and "1" (dual monitor setup)
- Single monitor systems: Renderer only displays monitor "0" section (monitor "1" is skipped since it doesn't exist)
- Monitor headers are shown based on system monitor count (not Display Group configuration)
  - Single monitor system: Headers shown
  - Multi-monitor system: Headers shown (even if Display Group only references one monitor)
- No special-case code needed - single monitor is handled by the same multi-monitor rendering logic

### Error Handling

- If monitor in Display Group doesn't exist: Show error indicator (⚠️ "Not Connected") at expected position (Option B)
- If monitor disconnected while panel open: Panel re-renders with error indicators
- If monitor reconnected: Panel re-renders with normal monitor sections
- If no monitors detected (shouldn't happen): Fallback to single monitor with index 0

## Testing Checklist

### Monitor Detection
- [ ] Single monitor: Detected correctly
- [ ] Dual monitor (same resolution): Both detected
- [ ] Dual monitor (different resolutions): Both detected with correct dimensions
- [ ] Triple monitor: All three detected
- [ ] Monitor hotplug: Disconnect/reconnect handled
- [ ] Primary monitor change: Detected and handled

### UI Rendering
- [ ] Single monitor system: Monitor headers shown based on system monitor count (not Display Group count)
- [ ] Dual monitor: Two sections displayed in physical 2D arrangement
- [ ] Triple monitor: Three sections displayed in physical 2D arrangement
- [ ] Different aspect ratios: Miniature displays scaled correctly
- [ ] Panel positioning: Appears on correct monitor (cursor-based)
- [ ] Layout button highlighting: Correct per monitor
- [ ] Missing monitor: Error indicator displays correctly

### Layout Application
- [ ] Click layout on monitor 0: Applied to window on monitor 0
- [ ] Click layout on monitor 1: Applied to window on monitor 1
- [ ] Layout expressions: Evaluated using correct monitor's work area
- [ ] Window positioning: Correct absolute coordinates
- [ ] Edge threshold detection: Works on all monitors

### History Tracking
- [ ] Select layout on monitor 0: Recorded in monitor 0 history
- [ ] Select layout on monitor 1: Recorded in monitor 1 history
- [ ] Same app on different monitors: Different history per monitor

### Edge Cases
- [ ] Monitor disconnect while panel open: Panel updates gracefully (shows error indicator)
- [ ] Monitor reconnect: Config restored correctly
- [ ] Resolution change: Panel re-renders correctly
- [ ] Primary monitor change: No errors
- [ ] Display Group references non-existent monitor: Error indicator shown
- [ ] Invalid Layout Group name in import: Validation error reported

## Expected Behavior Examples

### Example 1: Dual Monitor (Horizontal Layout, Different Resolutions)
Physical setup:
- Monitor 0: 1920x1080 (16:9), at position (0, 0)
  - Assigned: "Vertical Division Patterns"
- Monitor 1: 2560x1440 (16:9), at position (1920, 0) - to the right
  - Assigned: "Grid Patterns"

Bounding box: width = 4480px (1920 + 2560), height = 1440px
Scale factor (assuming MAX_PANEL_WIDTH = 800): scale = 800 / 4480 = 0.179

Panel displays (preserving physical layout):
```
┌─ Monitor 0 - 1920x1080 ──┐ ┌─ Monitor 1 (Primary) - 2560x1440 ──┐
│ [Miniature displays for  │ │ [Miniature displays for Grid...]   │
│  Vertical...]            │ │ (scaled: 458x258px)                │
│ (scaled: 343x193px)      │ │                                    │
└──────────────────────────┘ └────────────────────────────────────┘
```

Monitor 0 section: position (0, 0), size (343px, 193px)
Monitor 1 section: position (343, 0), size (458px, 258px)

### Example 2: Triple Monitor (L-shaped Layout)
Physical setup:
- Monitor 0: 1920x1080, at position (0, 0) - top left
- Monitor 1: 2560x1440, at position (1920, 0) - top right
- Monitor 2: 1920x1080, at position (1920, 1440) - bottom right

Bounding box: width = 4480px, height = 2520px
Scale factor (assuming both MAX_PANEL_WIDTH=800, MAX_PANEL_HEIGHT=600):
- Horizontal scale: 800 / 4480 = 0.179
- Vertical scale: 600 / 2520 = 0.238
- Use smaller: scale = 0.179

Panel displays (preserving L-shaped layout):
```
┌─ Monitor 0 ─┐ ┌─ Monitor 1 ────┐
│ 343x193px   │ │ 458x258px      │
└─────────────┘ └────────────────┘
                ┌─ Monitor 2 ────┐
                │ 343x193px      │
                └────────────────┘
```

Monitor 0 section: position (0, 0)
Monitor 1 section: position (343, 0)
Monitor 2 section: position (343, 258)

This preserves the spatial relationship: Monitor 2 is below and aligned with Monitor 1.

### Example 3: Layout Application
- User drags window on monitor 1 (index 0)
- Cursor reaches edge of monitor 1
- Panel appears showing layouts for all monitors in their physical 2D arrangement
- User clicks layout button in Monitor 2 section (index 1)
- Layout applied to window using Monitor 2's work area:
  - workArea = { x: 1920, y: 0, width: 2560, height: 1440 }
  - Layout "Left Half" (x='0', width='50%') becomes:
    - x = 1920 + 0 = 1920
    - width = 2560 * 0.5 = 1280
- Window physically moves and snaps to left half of monitor 2
- Selection recorded in monitor "1" history (0-based key)

## Estimation

### Complexity: High
- New subsystem (MonitorManager) introduction
- Multiple file modifications across UI, repository, and controller layers
- Two-format system (input format with name references → runtime format with expanded IDs)
- Edge case handling for monitor configuration changes

### Estimated Points: 23 points

**Breakdown:**
- Phase 1 (Foundation): 3 points
- Phase 2 (Data Structure Refactoring): 3 points
- Phase 3 (UI Rendering): 5 points
- Phase 4 (Layout Application): 3 points
- Phase 5 (Per-Monitor History): 3 points
- Phase 6 (Error Handling for Missing Monitors): 2 points
- Phase 7 (Additional Edge Cases): 2 points
- Phase 8 (Polish & Documentation): 2 points

## Notes

- **Monitor identification**: INDEX only (0-based numbering: "0", "1", "2"...)
- **Panel positioning**: Cursor-based (appears on monitor where cursor is)
- **Panel layout**: Mirrors physical monitor arrangement using absolute positioning within each Display Group
- **Display Groups**: Represent different monitor-to-Layout Group assignment patterns
  - A Category can have multiple Display Groups (e.g., "both monitors same", "different per monitor")
  - User creates Display Groups by editing input configuration (GlobalLayoutSettings format)
- **Input vs Runtime formats**:
  - **Input format** (user writes): GlobalLayoutSettings with global layoutGroups array, displayGroups reference by name
  - **Runtime format** (stored in imported-layouts.json): LayoutCategory[] with Display Groups containing expanded LayoutGroups with unique IDs
- **Layout Group expansion**: During import, Snappa resolves Layout Group names and creates separate instances with unique IDs for each monitor in each Display Group
- **History tracking**: Per-monitor to support different workflows on different monitors (version 2 format)
- **Scale factor**: Calculated per Display Group to fit all referenced monitors in panel while preserving aspect ratios and spatial relationships
- **Error handling**: Missing monitors show error indicator (Option B)
- **Breaking change**: Requires deleting existing `imported-layouts.json` and `layout-history.json` before implementation (backup first)

