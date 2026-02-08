# Multi-Monitor Support Implementation Plan

Status: Completed

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

**Implementation Strategy:**
This plan uses a **staged, backward-compatible approach**:
- **Phase 1-2**: Add new functionality while preserving existing features
  - MonitorManager integrated with existing code
  - New data types coexist with old types
  - All existing functionality continues to work
- **Phase 3**: Complete UI migration to Display Group structure
  - All new components implemented together
  - Error handling for missing monitors included
  - First breaking change: old layout data automatically migrated
- **Phase 4-5**: Multi-monitor features activated
  - Per-monitor layout application
  - Per-monitor history tracking with automatic migration
- **Phase 6-7**: Cleanup and polish

This approach allows testing existing functionality after each major phase while minimizing throwaway code.

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
export interface Monitor {
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
 * Migration from version 1 (old format) is handled automatically in Phase 5.
 * Old history entries are migrated to monitor "0".
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

// NEW: Complete layout configuration structure (for import input)
export interface LayoutConfiguration {
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
- Create Monitor for each monitor (index, geometry, work area, isPrimary)
- Track monitor configuration changes via `monitors-changed` signal
- Provide monitor lookup by position (for cursor-based detection)
- Provide monitor lookup by window (which monitor a window is on)

Critical methods:
```typescript
class MonitorManager {
  detectMonitors(): Map<string, Monitor>
  getMonitorByKey(monitorKey: string): Monitor | null  // Lookup by "0", "1", etc.
  getMonitorAtPosition(x, y): Monitor | null
  getMonitorForWindow(window): Monitor | null
  connectToMonitorChanges(display): void
  calculateBoundingBox(monitors: Monitor[]): BoundingBox
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

**Modify: `src/app/ui/miniature-display.ts`** (extend existing)

Extends the existing miniature display to support monitor headers and error states.

A **Miniature Display** represents one monitor, with a header and layout buttons:
```typescript
function createMiniatureDisplayView(
  monitor: Monitor,  // Added: monitor information for header
  layoutGroup: LayoutGroup,  // The Layout Group assigned to this monitor
  displayWidth: number,
  displayHeight: number,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): MiniatureDisplayView

// Error state for missing monitors
function createMiniatureDisplayErrorView(
  monitorKey: string,
  displayWidth: number,
  displayHeight: number
): St.Widget
```

**Key changes:**
- Add `monitor` parameter to signature
- Add header rendering at top: "Monitor 1", "Monitor 2 (Primary)", etc.
  - Format: "Monitor {index+1}" for user-friendly labeling
  - Add "(Primary)" suffix if `monitor.isPrimary === true`
- Add error view helper for missing monitors (⚠️ "Not Connected")
- Pass `monitorKey` to layout selection callback

Visual structure:
```
Miniature Display (vertical container for each monitor)
├── Monitor Header Label ("Monitor 1 (Primary)")
└── Layout Buttons Container (existing functionality)
    ├── Layout Button 1
    ├── Layout Button 2
    └── Layout Button 3

Overall Panel Container (vertical layout for categories)
├── Miniature Space (with Clutter.FixedLayout for 2D monitor positioning)
│   ├── Miniature Display 0 (positioned at scaled x, y via set_position())
│   └── Miniature Display 1 (positioned at scaled x, y via set_position())
└── (Next Miniature Space...)
```

**New file: `src/app/ui/miniature-space.ts`**

Creates a **Miniature Space** that displays all monitors in their physical 2D arrangement.
A Miniature Space is the UI representation of a Display Group:

```typescript
function createMiniatureSpaceView(
  displayGroup: DisplayGroup,
  monitors: Map<string, Monitor>,
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): MiniatureSpaceView
```

**Implementation details:**
- Creates `St.Widget` with `Clutter.FixedLayout()` for absolute positioning
- Iterates through `displayGroup.displays` entries
- For each monitor key:
  - If monitor exists: creates miniature display using `createMiniatureDisplayView()`
  - If monitor missing: creates error view using `createMiniatureDisplayErrorView()`
- Calculates bounding box from all monitors in the Display Group
- Calculates scale factor to fit in panel constraints
- Positions each miniature display at scaled coordinates using `set_position()`

**Modify: `src/app/main-panel/renderer.ts`**

Replace `createCategoriesView` with a multi-monitor version:
```typescript
function createCategoriesView(
  monitors: Map<string, Monitor>,
  categories: LayoutCategory[],  // Categories with Display Groups
  debugConfig: DebugConfig | null,
  window: Meta.Window | null,
  onLayoutSelected: (layout: Layout, monitorKey: string) => void
): CategoriesView
```

**Key implementation notes:**
- Replace existing `createCategoriesView` completely (single-monitor is NOT a special case - all code uses Display Groups)
- For each Category, iterate through its Display Groups
- Call `createMiniatureSpaceView()` from `miniature-space.ts` for each Display Group
- Stack Miniature Spaces vertically within the category

Implementation steps (for `miniature-space.ts`):

**For each Display Group:**
1. **Calculate bounding box**: Get the overall dimensions of all monitors referenced in this Display Group
2. **Calculate scale factor**: Determine how much to scale down to fit in panel
   - `scale = MAX_PANEL_WIDTH / boundingBox.width`
   - Or `scale = MAX_PANEL_HEIGHT / boundingBox.height`
   - Use the smaller scale to fit both dimensions
3. **Create absolute positioning container**: Use `St.Widget` with `Clutter.FixedLayout()` that supports child positioning
4. **For each [monitorKey, layoutGroup] in displayGroup.displays**:
   - Get Monitor for this monitor key from monitors Map
   - If monitor not found, create error indicator using `createMiniatureDisplayErrorView()`
   - Calculate miniature display dimensions (scaled monitor width/height)
   - Calculate position: `scaledX = (monitor.x - bbox.minX) * scale`, `scaledY = (monitor.y - bbox.minY) * scale`
   - Create miniature display with the Layout Group using `createMiniatureDisplayView()`
   - Set position using `miniatureDisplay.set_position(scaledX, scaledY)`
   - Add to absolute positioning container
5. Return the Miniature Space container

This creates a structure where:
- Each **Category** contains multiple **Miniature Spaces** (assembled in `renderer.ts`)
- Each **Miniature Space** shows a 2D spatial layout of monitors (created in `miniature-space.ts`)
- Each **Miniature Display** displays the assigned Layout Group's layout buttons (created in `miniature-display.ts`)

**Miniature Display Sizing:**

Each miniature display is scaled proportionally based on the bounding box scale factor:
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
- Look up Monitor for that monitorKey
- Use monitor-specific work area for expression evaluation
- Record selection in per-monitor history: `setSelectedLayoutForMonitor(monitorKey, ...)`

Layout expression evaluation:
```typescript
const monitor = this.monitorManager.getMonitorByKey(monitorKey);
const workArea = monitor.workArea;
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
- Backward-compatible migration: old format automatically migrated to monitor "0" (see Pre-Implementation: Data Migration Strategy section)

### Repository Changes

**Modify: `src/app/repository/layouts.ts`**

Update to handle new Display Group structure:

```typescript
// NEW (Phase 2): Load layouts as categories (returns LayoutCategory[] with expanded Display Groups)
export function loadLayoutsAsCategories(): LayoutCategory[]

// NEW (Phase 2): Import configuration and convert to runtime format
export function importLayoutConfiguration(config: LayoutConfiguration): void

// EXISTING: Keep old functions for backward compatibility during Phase 1-2
export function loadLayouts(): LayoutGroupCategory[]  // Old format
export function importSettings(settings: LayoutCategorySetting[]): void  // Old format

// Internal helper
function saveLayouts(categories: LayoutCategory[]): void
```

Key changes:
- **Phase 2**: Add new functions `loadLayoutsAsCategories()` and `importLayoutConfiguration()`
- **Phase 2**: Keep existing `loadLayouts()` and `importSettings()` working
- **Phase 3**: Switch to using new functions in main-panel/index.ts
- **Phase 6**: Deprecate/remove old functions
- **importLayoutConfiguration()** accepts `LayoutConfiguration` (with global layoutGroups and layoutCategories)
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

Change from `LayoutCategorySetting[]` to `LayoutConfiguration`:

```typescript
export const DEFAULT_LAYOUT_SETTINGS: LayoutConfiguration = {
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

### Phase 1: Foundation (Monitor Detection and Integration)
- Create `src/app/types/monitor-config.ts` with type definitions
- Create `src/app/monitor/manager.ts` with MonitorManager class
- Modify `src/app/controller.ts`:
  - Initialize MonitorManager in constructor
  - Call `detectMonitors()` in `enable()`
  - Connect to `monitors-changed` signal
  - **Replace existing monitor detection code** with MonitorManager:
    - Update `isAtScreenEdge()` to use MonitorManager
    - Update `applyLayoutToCurrentWindow()` to use MonitorManager for work area
- **Test: Verify existing functionality works with MonitorManager**
  - Drag window to edge → panel appears ✓
  - Select layout → window snaps correctly ✓
  - Multiple monitors: verify correct monitor detection ✓

### Phase 2: Data Structure Preparation (Backward Compatible)
**Goal: Add new types and support WITHOUT breaking existing functionality**

- Update `src/app/types/layout-setting.ts`:
  - Add `DisplayGroupSetting` interface
  - Add `LayoutConfiguration` interface
  - **Keep existing `LayoutCategorySetting` unchanged**
- Create `src/app/types/display-group.ts` (runtime type)
- Create `src/app/types/layout-category.ts` (runtime type)
- Modify `src/app/constants.ts`:
  - **Keep `DEFAULT_LAYOUT_SETTINGS: LayoutCategorySetting[]` unchanged**
  - Add new constant: `DEFAULT_LAYOUT_CONFIGURATION: LayoutConfiguration`
  - This configuration has dual-monitor Display Groups by default
- Modify `src/app/repository/layouts.ts`:
  - Add new function: `importLayoutConfiguration(config: LayoutConfiguration): void`
  - Add new function: `loadLayoutsAsCategories(): LayoutCategory[]` (reads new format)
  - **Keep existing `loadLayouts()` and `importSettings()` functions**
  - Implement conversion logic: LayoutConfiguration → LayoutCategory[] with expanded Display Groups
- Modify `src/app/repository/layout-history.ts`:
  - Add version field support (prepare for version 2)
  - Add new functions (not yet used):
    - `setSelectedLayoutForMonitor(monitorKey, windowId, wmClass, title, layoutId)`
    - `getSelectedLayoutIdForMonitor(monitorKey, windowId, wmClass, title)`
  - **Keep existing functions working**
- **Test: Verify existing functionality still works**
  - Extension loads without errors ✓
  - Existing layouts display correctly ✓
  - Layout selection and history work ✓

### Phase 3: UI Migration (Complete Replacement)
**Goal: Implement all new UI components and switch to new data structure**

**UI Concept:**
- **Miniature Display**: Represents one monitor (with header and layout buttons)
- **Miniature Space**: Contains multiple Miniature Displays in 2D arrangement

**Implementation order (all in one phase, but in this sequence):**

1. **Update miniature-display.ts** (extend existing)
   - Add monitor header support
   - Update `createMiniatureDisplayView()` signature to accept `Monitor`
   - Add header rendering ("Monitor 1", "Monitor 2", etc.)
   - Add error state support for missing monitors
   - Implement `createMiniatureDisplayErrorView()` helper (shows "⚠️ Not Connected")

2. **Create miniature-space.ts** (new file)
   - Implement `createMiniatureSpaceView()` function
   - Takes DisplayGroup with expanded LayoutGroups and MonitorManager
   - Creates 2D spatial layout using Clutter.FixedLayout()
   - For each monitor in DisplayGroup:
     - If monitor exists: call `createMiniatureDisplayView()` with Monitor
     - If monitor missing: call `createMiniatureDisplayErrorView()`
   - Position each miniature display to preserve physical monitor arrangement

3. **Update renderer.ts**
   - Replace `createCategoriesView()` signature:
     - Add `monitors: Map<string, Monitor>` parameter
     - Change `categories: LayoutGroupCategory[]` to `categories: LayoutCategory[]`
   - Update implementation:
     - Iterate through categories with Display Groups
     - Call `createMiniatureSpaceView()` for each Display Group
     - Stack Miniature Spaces vertically

4. **Update main-panel/index.ts**
   - Pass MonitorManager to renderer
   - Switch from `loadLayouts()` to `loadLayoutsAsCategories()`
   - Update panel creation to use new structure

5. **Update constants.ts**
   - Switch `DEFAULT_LAYOUT_SETTINGS` to use `DEFAULT_LAYOUT_CONFIGURATION`
   - Use `importLayoutConfiguration()` instead of `importSettings()`

**Test after Phase 3 completion:**
- Single monitor: Displays correctly with Display Group structure ✓
- Dual monitor: Both monitors display in 2D arrangement ✓
- Missing monitor: Error indicator displays correctly ✓
- Layout buttons render and respond to hover ✓

### Phase 4: Layout Application (Multi-Monitor Support)
- Modify `src/app/controller.ts`:
  - Update `applyLayoutToCurrentWindow()` signature to accept `monitorKey` parameter
  - Use monitor-specific work area for layout calculations
  - Record layout selection with `setSelectedLayoutForMonitor()` (per-monitor history)
- Modify `src/app/ui/miniature-display.ts`:
  - Pass monitorKey to layout selection callback: `onLayoutSelected(layout, monitorKey)`
- Modify MainPanel layout selection callback flow:
  - Update `setOnLayoutSelected` callback signature to include monitorKey
- **Test: Verify layouts are applied to correct monitor**
  - Click layout on monitor 0 → window snaps to monitor 0 work area ✓
  - Click layout on monitor 1 → window snaps to monitor 1 work area ✓
  - Layout expressions evaluated using correct monitor dimensions ✓

### Phase 5: Per-Monitor History (Complete Implementation)
- Modify `src/app/repository/layout-history.ts`:
  - Migrate to version 2 format with `byMonitor` structure
  - Implement migration from old format: existing history → monitor "0"
  - Activate `setSelectedLayoutForMonitor()` and `getSelectedLayoutIdForMonitor()` functions
  - Update `loadLayoutHistory()` to handle version 1 → version 2 migration
- Modify `src/app/ui/miniature-display.ts`:
  - Use `getSelectedLayoutIdForMonitor(monitorKey, ...)` for button highlighting
  - Pass monitorKey when creating layout buttons
- **Test: Verify history is tracked separately per monitor**
  - Select layout on monitor 0 → recorded in monitor "0" history ✓
  - Select layout on monitor 1 → recorded in monitor "1" history ✓
  - Same app on different monitors → different history per monitor ✓
  - Old history migrated to monitor "0" correctly ✓

### Phase 6: Cleanup and Edge Cases
- **Remove old code**:
  - Delete or deprecate old `loadLayouts()` if no longer needed
  - Delete or deprecate old `importSettings()` if no longer needed
  - Remove `DEFAULT_LAYOUT_SETTINGS` (replaced by `DEFAULT_LAYOUT_CONFIGURATION`)
  - Remove `src/app/ui/category.ts` (replaced by miniature-space.ts)
  - Note: `miniature-display.ts` is **retained and extended**, not removed
- **Edge case handling**:
  - Handle monitor disconnect/reconnect gracefully (re-render panel via `monitors-changed` signal)
  - Handle primary monitor changes
  - Handle resolution changes (trigger monitors-changed signal, re-render)
  - Handle missing Layout Group names during import (validation error with clear message)
- **Test: All edge case scenarios**
  - Monitor disconnect while panel open → panel updates gracefully ✓
  - Monitor reconnect → config restored correctly ✓
  - Resolution change → panel re-renders correctly ✓
  - Invalid Layout Group name in import → validation error reported ✓

### Phase 7: Polish & Documentation
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
- `src/app/ui/miniature-space.ts` - Miniature Space UI component (2D monitor layout)

### Modified Files
- `src/app/types/layout-setting.ts` - Add DisplayGroupSetting, LayoutConfiguration
- `src/app/constants.ts` - Update DEFAULT_LAYOUT_SETTINGS to LayoutConfiguration structure, add MAX_PANEL_WIDTH/HEIGHT
- `src/app/repository/layouts.ts` - Import LayoutConfiguration, expand Layout Groups, save LayoutCategory[] runtime format
- `src/app/repository/layout-history.ts` - Per-monitor history support (version 2)
- `src/app/controller.ts` - Integrate MonitorManager, update layout application with monitorKey
- `src/app/main-panel/index.ts` - Pass MonitorManager to renderer
- `src/app/main-panel/renderer.ts` - Multi-monitor rendering with Miniature Spaces (expanded LayoutGroups)
- `src/app/ui/miniature-display.ts` - Extend to support monitor headers and error states
- `src/app/ui/layout-button.ts` - Per-monitor history highlighting
- `src/app/types/index.ts` - Export new types (DisplayGroup, LayoutCategory, Monitor, etc.)

### Removed Files
- `src/app/ui/category.ts` - Replaced by miniature-space.ts

## Pre-Implementation: Data Migration Strategy

**IMPORTANT**: This implementation uses a **backward-compatible migration strategy**. No manual data deletion is required.

### Migration Approach

**Phase 2 Strategy (Backward Compatible):**
- New data types coexist with old types
- Old `imported-layouts.json` continues to work during Phases 1-2
- New `LayoutConfiguration` format is prepared but not yet used
- History format upgrade is prepared but not yet activated

**Phase 3 Strategy (Data Format Switch):**
- When switching `DEFAULT_LAYOUT_CONFIGURATION` in constants.ts:
  - Extension will use new Display Group structure
  - Old `imported-layouts.json` will be replaced with new format on first load
  - Users may want to backup their custom layouts before Phase 3

**Phase 5 Strategy (History Migration):**
- Old history format (flat structure) is automatically migrated:
  - Existing history entries → assigned to monitor "0"
  - New per-monitor tracking starts from Phase 5
- Migration is automatic and transparent to users

### Recommended Backup (Optional)

Before starting Phase 3 implementation, users may optionally backup existing data:

```bash
# Optional backup before Phase 3
cp ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/imported-layouts.json \
   ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/imported-layouts.json.backup

cp ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/layout-history.json \
   ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/layout-history.json.backup
```

### Single Monitor Behavior

- Default Display Groups in `DEFAULT_LAYOUT_CONFIGURATION` assign Layout Groups to monitors "0" and "1" (dual monitor setup)
- Single monitor systems: Only monitor "0" section is displayed (monitor "1" shows error indicator if Display Group references it)
- Monitor headers are shown based on Display Group configuration
- No special-case code needed - single monitor is handled by the same multi-monitor rendering logic

### Error Handling (Integrated in Phase 3)

- If monitor in Display Group doesn't exist: Show error indicator (⚠️ "Not Connected") at expected position
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
- [ ] Single monitor system: Monitor "0" displays correctly, monitor "1" shows error indicator (Display Group references both)
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
- New subsystem (MonitorManager) introduction and integration with existing code
- Multiple file modifications across UI, repository, and controller layers
- Two-format system (input format with name references → runtime format with expanded IDs)
- Backward-compatible migration strategy during implementation
- Edge case handling for monitor configuration changes

### Estimated Points: 23 points

**Breakdown:**
- Phase 1 (Foundation - Monitor Detection and Integration): 4 points
  - MonitorManager implementation: 2 points
  - Integration with existing controller code: 2 points
- Phase 2 (Data Structure Preparation - Backward Compatible): 4 points
  - New type definitions and runtime types: 2 points
  - Repository layer dual-format support: 2 points
- Phase 3 (UI Migration - Complete Replacement): 5 points
  - miniature-display.ts extension (headers and error states): 1.5 points
  - miniature-space.ts implementation: 1.5 points
  - renderer.ts and main-panel/index.ts updates: 2 points
- Phase 4 (Layout Application - Multi-Monitor Support): 3 points
- Phase 5 (Per-Monitor History - Complete Implementation): 3 points
- Phase 6 (Cleanup and Edge Cases): 2 points
- Phase 7 (Polish & Documentation): 2 points

## Notes

- **Monitor identification**: INDEX only (0-based numbering: "0", "1", "2"...)
- **Panel positioning**: Cursor-based (appears on monitor where cursor is)
- **UI Concepts**:
  - **Miniature Display**: Represents one monitor with header and layout buttons (extended from existing concept)
  - **Miniature Space**: Contains multiple Miniature Displays in 2D arrangement (new concept, UI representation of Display Group)
- **Panel layout**: Mirrors physical monitor arrangement using absolute positioning within each Miniature Space
- **Display Groups**: Represent different monitor-to-Layout Group assignment patterns (data concept)
  - A Category can have multiple Display Groups (e.g., "both monitors same", "different per monitor")
  - User creates Display Groups by editing input configuration (LayoutConfiguration format)
  - Each Display Group is rendered as one Miniature Space in the UI
- **Input vs Runtime formats**:
  - **Input format** (user writes): LayoutConfiguration with global layoutGroups array, displayGroups reference by name
  - **Runtime format** (stored in imported-layouts.json): LayoutCategory[] with Display Groups containing expanded LayoutGroups with unique IDs
- **Layout Group expansion**: During import, Snappa resolves Layout Group names and creates separate instances with unique IDs for each monitor in each Display Group
- **History tracking**: Per-monitor to support different workflows on different monitors (version 2 format)
- **Scale factor**: Calculated per Display Group to fit all referenced monitors in panel while preserving aspect ratios and spatial relationships
- **Error handling**: Missing monitors show error indicator (integrated in Phase 3)
- **Migration strategy**: Backward-compatible during Phases 1-2, with automatic data migration in Phases 3 and 5
  - Phase 3: Old layout data automatically replaced with new Display Group structure
  - Phase 5: Old history data automatically migrated to monitor "0"
  - Optional backup recommended before Phase 3 implementation

