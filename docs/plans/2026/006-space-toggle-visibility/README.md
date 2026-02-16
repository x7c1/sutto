# Space Toggle Visibility

Status: Completed

## Overview

Add functionality for users to toggle individual Spaces on/off via the Preferences UI. When a Space is toggled off, it will be hidden from the main panel but its configuration data will be preserved.

## Requirements

- Users can enable/disable individual Spaces from the Preferences UI
- Disabled Spaces are hidden from the main panel (not rendered)
- Space configuration data is preserved when disabled (not deleted)
- Disabled state persists across extension restarts
- Changes take effect immediately (no restart required)

## Scope

**Backward compatibility is not a consideration** - the only user is the developer. Migration complexity and schema stability are not decision factors.

## Current State

- `Space` type has `id` (UUID) and `displays` (monitor-to-LayoutGroup mapping)
- Data is stored in `imported-layouts.json` as `SpacesRow[]`
- Space IDs are generated at runtime but persisted to the JSON file
- Preferences UI currently only has keyboard shortcut settings
- Miniature Space UI component exists (`src/app/ui/miniature-space.ts`)

## Technical Approach

### Storage Strategy

Add `enabled` property directly to the `Space` type and persist it in the data file.

Rationale:
- Single source of truth for all Space data
- Space `id` is already persisted in the JSON file
- Simpler implementation without GSettings involvement

### File and Module Renames

As part of this work, rename files to better reflect their purpose:

| Type | Old | New |
|------|-----|-----|
| Data file | `imported-layouts.json` | `spaces.json` |
| Data file | `layout-history.json` | `history.json` |
| TypeScript | `layouts.ts` | `spaces.ts` |
| TypeScript | `layout-history.ts` | `history.ts` |

## Implementation Plan

### Phase 1: Update Space type

**File**: `src/app/types/space.ts`

- Add `enabled: boolean` property to `Space` interface

### Phase 2: Rename files

**Files**:
- `src/app/repository/layouts.ts` → `src/app/repository/spaces.ts`
- `src/app/repository/layout-history.ts` → `src/app/repository/history.ts`
- Data file: `imported-layouts.json` → `spaces.json`
- Data file: `layout-history.json` → `history.json`

Update all import statements across the codebase.

### Phase 3: Add Space enabled state update function

**File**: `src/app/repository/spaces.ts`

- Add `setSpaceEnabled(spaceId: string, enabled: boolean): void`
  - Load all SpacesRows from spaces.json
  - Find the Space by `id`
  - Update its `enabled` property
  - Save all SpacesRows back to spaces.json

### Phase 4: Update MainPanel filtering

**File**: `src/app/main-panel/index.ts`

- Reload SpacesRows from repository on every `show()` call (simplest notification mechanism)
- Filter out Spaces where `enabled === false` before rendering
- Hide entire row when all Spaces in that row are disabled

### Phase 5: Add Preferences UI

**Files**:
- `src/settings/preferences.ts`
- `src/settings/gtk-miniature-space.ts` (new)
- `src/settings/gtk-miniature-display.ts` (new)

#### UI Structure (Multiple Pages)

```
PreferencesWindow
├── PreferencesPage "General" (icon: preferences-system-symbolic)
│   └── PreferencesGroup "Keyboard Shortcuts"
│       └── (existing shortcut settings)
└── PreferencesPage "Spaces" (icon: view-grid-symbolic)
    └── PreferencesGroup
        ├── Space 1 (Miniature + Switch)
        ├── Space 2 (Miniature + Switch)
        └── ...
```

#### Implementation

- Restructure preferences.ts to use multiple `Adw.PreferencesPage`
  - "General" page: existing keyboard shortcut settings
  - "Spaces" page: new Space management UI
- Create new GTK-based Miniature Space components using `Gtk.DrawingArea` + Cairo
  - `gtk-miniature-space.ts`: Space container, positions multiple displays
  - `gtk-miniature-display.ts`: Single monitor view with layout rectangles
  - Shares types, constants, and calculation logic with Shell version
  - Cannot reuse existing Shell components (Clutter/St not available in GTK process)
  - See [adr-002-ui-component-sharing.md](./adr-002-ui-component-sharing.md) for rationale
- For each Space in loaded SpacesRows:
  - Display the GTK Miniature Space visualization (with layout rectangles for identification)
  - Add `Gtk.Switch` to toggle enabled/disabled state
  - On toggle: call `setSpaceEnabled(space.id, enabled)`

## Files to Modify

| File | Type | Description |
|------|------|-------------|
| `src/app/types/space.ts` | Modify | Add `enabled` property |
| `src/app/repository/layouts.ts` | Rename | → `spaces.ts`, add `setSpaceEnabled` |
| `src/app/repository/layout-history.ts` | Rename | → `history.ts` |
| `src/app/main-panel/index.ts` | Modify | Reload on show(), filter disabled Spaces, hide empty rows |
| `src/settings/gtk-miniature-space.ts` | Create | GTK Space container, positions multiple displays |
| `src/settings/gtk-miniature-display.ts` | Create | GTK single monitor view with layout rectangles |
| `src/settings/preferences.ts` | Modify | Restructure to multiple pages (General, Spaces) |
| Various files | Modify | Update import statements for renamed modules |

## Verification

- Run `npm run build && npm run check && npm run test:run`
- Manual testing:
  - Open Preferences, verify Spaces list displays with Miniature Space visuals
  - Toggle a Space off, verify it disappears from panel immediately
  - Restart extension, verify disabled state persists
  - Toggle Space back on, verify it reappears in panel

## Effort Estimate

- Phase 1: 1 point (type update)
- Phase 2: 1 point (file renames and import updates)
- Phase 3: 1 point (setSpaceEnabled function)
- Phase 4: 1 point (MainPanel filtering)
- Phase 5: 4 points (GTK Miniature Space/Display + Preferences UI)
- Testing: 1 point
- **Total: 9 points**

## Related Documents

- [roadmap.md](./roadmap.md) - Future Space features (preset/custom spaces)
- [adr-001-storage-strategy.md](./adr-001-storage-strategy.md) - Storage strategy decision
- [adr-002-ui-component-sharing.md](./adr-002-ui-component-sharing.md) - UI component sharing decision
- [adr-003-preferences-ui-structure.md](./adr-003-preferences-ui-structure.md) - Preferences UI structure decision
