# Layout History Highlight Feature

Status: Completed

## Overview

Implement visual highlighting of previously selected layouts in the snap menu on a per-application basis. When a user opens the snap menu, the layout button that was last selected for that application (identified by WM_CLASS) will be highlighted in blue, providing visual feedback and improving user experience.

## Background

### Current Situation
- The snap menu currently does not track or display layout selection history
- Users cannot visually identify which layout they previously used for an application
- This leads to inefficiency when users repeatedly apply the same layout to similar applications

### Problem Statement
Users want to know which layout they last selected for each application when they open the snap menu, especially when:
- Reopening the same application after closing it
- Working with multiple windows of the same application
- Switching between different applications with preferred layouts

## Requirements

### Functional Requirements
- **Visual Highlighting**: Previously selected layout button should be highlighted with a distinct color
  - Highlight color: Blue `rgba(100, 150, 250, 0.7)`
  - Visual priority: Hover > Selected > Normal
- **Per-Application Tracking**: Layout history tracked by application using WM_CLASS identifier
  - Example: Firefox → "Left Half", Terminal → "Right Half"
- **Persistence**: Layout selection history must persist across GNOME Shell sessions
- **Graceful Degradation**: Applications without WM_CLASS should function normally (no highlight)

### Technical Requirements
- Must work with GNOME Shell 42 APIs
- Follow existing codebase patterns (similar to `debug-config.ts` for persistence)
- Minimize changes to existing code
- Auto-save on each layout selection
- Load history on extension initialization

## Implementation Plan

### Phase 0: Layout ID System (Prerequisite Refactoring)

**Problem**: Current `Layout` type only has a `label` field, which is not unique across categories. Multiple layouts have the same label (e.g., "Top-left" appears in Thirds, Ninths, Corners, and Eighths categories), making it impossible to uniquely identify layouts for history tracking.

**Solution**: Introduce a unique ID system for layouts by separating settings configuration from runtime layout objects.

#### Architecture Change

**Before**:
```typescript
interface Layout {
  label: string;  // Not unique!
  x: string;
  y: string;
  width: string;
  height: string;
}

const DEFAULT_CATEGORIES: LayoutGroupCategory[] = [...];
```

**After**:
```typescript
// Configuration layer (settings definitions)
interface LayoutSetting {
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
}

interface LayoutGroupSetting {
  name: string;
  layouts: LayoutSetting[];
}

interface LayoutCategorySetting {
  name: string;
  layoutGroups: LayoutGroupSetting[];
}

// Runtime layer (with unique IDs)
interface Layout {
  id: string;        // NEW: Unique identifier (UUID)
  hash: string;      // NEW: Coordinate-based hash for duplicate detection
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
}

// Keep existing types unchanged
interface LayoutGroup {
  name: string;
  layouts: Layout[];  // Now contains layouts with IDs
}

interface LayoutGroupCategory {
  name: string;
  layoutGroups: LayoutGroup[];
}
```

#### Implementation Steps

1. **Create layout settings type** (`src/snap/types/layout-setting.ts`)
   - Define `LayoutSetting`, `LayoutGroupSetting`, `LayoutCategorySetting` interfaces
   - These represent the configuration data structure (used for both DEFAULT_LAYOUT_SETTINGS and user imports)

2. **Update Layout type** (`src/snap/types/layout.ts`)
   - Add `id: string` field to `Layout` interface (UUID for unique identification)
   - Add `hash: string` field to `Layout` interface (coordinate-based hash for duplicate detection)

3. **Rename and restructure constants** (`src/snap/snap-menu-constants.ts`)
   - Rename `DEFAULT_CATEGORIES` to `DEFAULT_LAYOUT_SETTINGS`
   - Type changes to `LayoutCategorySetting[]`
   - **No IDs in settings** - IDs are added only when imported to repository

4. **Create hash generator utility** (`src/snap/layout-hash-generator.ts`)
   - Function: `generateLayoutHash(x: string, y: string, width: string, height: string): string`
   - Generates deterministic hash from layout coordinates and dimensions
   - Example: `x: "0", y: "0", width: "50%", height: "100%"` → `"hash-a3f5b2c1"`
   - **Purpose**: Detect layouts with identical coordinates (for duplicate detection)
   - **Implementation**: Simple hash algorithm (e.g., MD5 or simple string concatenation hash)

5. **Create layouts repository** (`src/snap/layouts-repository.ts`)
   - **Role**: Persist layouts (handle import of settings and loading of layouts)
   - **Storage**: `~/.local/share/gnome-shell/extensions/snappa@snappa.dev/imported-layouts.json`
   - **Data format**: Serialized `Layout[]` with `id` and `hash` fields
   - **Key Functions**:
     - `importSettings(settings: LayoutCategorySetting[])` - Import settings as layouts
       - For each setting: generate UUID via `GLib.uuid_string_random()`
       - For each setting: generate hash via `generateLayoutHash(x, y, width, height)`
       - Create `Layout` objects with both `id` and `hash`
       - Organize into `LayoutGroupCategory[]` structure
       - Save to disk
     - `loadLayouts(): LayoutGroupCategory[]` - Load persisted layouts from disk
       - Returns layouts with IDs and hashes already attached
     - `addLayout(setting: LayoutSetting)` - Import single layout setting
   - **Critical**: Repository persists **Layout objects** (not settings), ensuring ID stability across restarts
   - **Internal helper**: Uses `generateLayoutHash()` utility for hash generation
   - Pattern: Follow `debug-config.ts` and `layout-history.ts` persistence patterns

6. **Update menu initialization**
   - **First launch** (repository is empty):
     ```typescript
     const layouts = layoutsRepository.loadLayouts();
     if (layouts.length === 0) {
       // Import DEFAULT_LAYOUT_SETTINGS to repository
       // This converts settings → layouts (add UUID + hash) and persists
       layoutsRepository.importSettings(DEFAULT_LAYOUT_SETTINGS);
     }
     // Load layouts from repository (now persisted with IDs and hashes)
     const categories = layoutsRepository.loadLayouts();
     ```
   - **Subsequent launches**: Simply `layoutsRepository.loadLayouts()` (layouts already persisted)
   - **Future**: When new DEFAULT_LAYOUT_SETTINGS are added, detect via hash and import to repository
   - **Note**: Repository handles the entire conversion process internally (settings → layouts with ID + hash)

#### Benefits

- **Unique Identification**: Each layout has a stable, unique ID (UUID)
- **ID Stability**: Repository layouts are saved with IDs, ensuring highlights persist across restarts
- **Duplicate Detection**: Hash enables detection of layouts with identical coordinates
  - Prevents importing duplicate layouts
  - Can suggest to user: "This layout is identical to existing 'Left Half'"
  - Enables future "merge duplicate layouts" feature
- **Configuration Separation**: Clear distinction between settings data and runtime objects
- **Repository Pattern**: All layouts (from DEFAULT_LAYOUT_SETTINGS or user imports) are persisted in repository
- **Future Extensibility**:
  - Users can import layout settings from external files
  - Users can create layouts via UI (saved to repository)
  - Settings can be exported/imported
  - Same data structure for all settings (DEFAULT or user-provided)
  - Duplicate detection prevents clutter
  - Repository is the single source of truth for all layouts
- **Backward Compatible**: Existing code using `Layout` type requires minimal changes

#### Files to Modify (Phase 0)

**New Files**:
- `src/snap/types/layout-setting.ts` - Layout settings configuration types
- `src/snap/layout-hash-generator.ts` - Hash generation utility (for duplicate detection)
- `src/snap/layouts-repository.ts` - Persist layouts (import settings, load layouts with IDs and hashes)

**Modified Files**:
- `src/snap/types/layout.ts` - Add `id` and `hash` fields
- `src/snap/snap-menu-constants.ts` - Rename to `DEFAULT_LAYOUT_SETTINGS` (no IDs in settings)
- `src/snap/snap-menu.ts` - Initialize repository on first launch, load from repository
- `src/snap/test-layouts.ts` - Update test data structure

### Design Principles for Future Extensibility

This implementation is designed with future multi-level history support in mind:

1. **Array-Based Storage from Day 1**: Use `string[]` instead of `string` to avoid migration pain
2. **Current Scope Constraint**: Initially maintain only 1 element in array (most recent selection)
3. **Future-Ready API**: Design function signatures that can easily support depth parameter
4. **Backward Compatible**: When extending to n-level history, existing data structure works as-is
5. **Gradient-Ready Architecture**: Button styling already separates hover/selected/normal states, making it easy to add multiple selection levels

**Example Evolution Path**:
- **Phase 0**: Introduce layout IDs - each layout gets unique UUID
- **Phase 1 (Current)**: `{ "firefox": ["550e8400-e29b-41d4-a716-446655440000"] }` → Highlight with `rgba(100, 150, 250, 0.7)`
- **Phase 2 (Future)**: `{ "firefox": ["uuid-1", "uuid-2", "uuid-3"] }` → Gradient highlight based on position (most recent to oldest)

### Architecture Overview

**Data Flow - Menu Display**:
```
WindowSnapManager.showSnapMenu()
  → getCurrentWindowWmClass()
  → SnapMenu.show(x, y, wmClass)
    → createCategoriesView(..., wmClass)
      → createCategoryView(..., wmClass)
        → createMiniatureDisplay(..., wmClass)
          → getSelectedLayoutId(wmClass)
          → For each layout: compare layout.id with selectedId
          → createLayoutButton(..., isSelected)
            → Apply blue highlight if isSelected
```

**Data Flow - Layout Selection**:
```
User clicks button
  → onLayoutSelected(layout)
    → WindowSnapManager.applyLayoutToCurrentWindow(layout)
      → setSelectedLayout(wmClass, layout.id)  // Use layout.id
        → saveLayoutHistory()
      → Apply window transformation
```

### Component Breakdown

#### 1. Layout History Manager (New Module)
- **File**: `src/snap/layout-history.ts`
- **Purpose**: Manage layout selection history with persistence
- **Pattern**: Follow `src/snap/debug-config.ts` implementation pattern
- **Data Structure**: `{ [wmClass: string]: string[] }` (wmClass → array of layout IDs, ordered by recency)
  - **Uses Layout IDs**: Now stores `layout.id` instead of `layout.label` (thanks to Phase 0)
  - **Design for Future Extensibility**: Use array structure from the start to enable multi-level history tracking
  - **Current Implementation**: Only use first element `array[0]` (most recent selection)
  - **Future Extension**: Support multiple history levels with gradient highlighting (n=3 or more)
  - **Migration-Free**: No breaking changes needed when adding multi-level support
- **Storage**: `~/.local/share/gnome-shell/extensions/snappa@snappa.dev/layout-history.json`
  - Example: `{ "firefox": ["550e8400-e29b-41d4-a716-446655440000"] }` (stores layout UUIDs)
- **Key Functions**:
  - `loadLayoutHistory()` - Load from disk on extension enable
  - `saveLayoutHistory()` - Save to disk (auto-save on change)
  - `setSelectedLayout(wmClass, layoutId)` - Record selection
    - If layout already selected (array[0] === layoutId): Do nothing (no duplicate)
    - Otherwise: Replace array with single-element array [layoutId]
    - This maintains single element for Phase 1, enables multi-element for Phase 2
  - `getSelectedLayoutId(wmClass)` - Retrieve most recent selection ID (array[0])
  - `getSelectedLayoutHistory(wmClass, depth?)` - (Future) Retrieve last n selection IDs for gradient highlighting

#### 2. Type Definition Updates
- **File**: `src/types/gnome-shell-42.d.ts`
- **Changes**: Add `get_wm_class(): string | null;` to `Meta.Window` interface

#### 3. Window Manager Integration
- **File**: `src/snap/window-snap-manager.ts`
- **Changes**:
  - Import layout history functions
  - Call `loadLayoutHistory()` in constructor
  - Add `getCurrentWindowWmClass()` helper method
  - Modify `showSnapMenu()` to extract and pass WM_CLASS
  - Update `applyLayoutToCurrentWindow()` to record selection via `setSelectedLayout()`

#### 4. Menu Layer Updates (Pass WM_CLASS Through Layers)
- **File**: `src/snap/snap-menu.ts`
  - Add `wmClass` parameter to `show()` method
  - Store as instance variable
  - Pass to `createCategoriesView()`

- **File**: `src/snap/snap-menu-renderer.ts`
  - Add `wmClass` parameter to `createCategoriesView()`
  - Pass to each `createCategoryView()`

- **File**: `src/snap/ui/category.ts`
  - Add `wmClass` parameter to `createCategoryView()`
  - Pass to `createMiniatureDisplay()`

- **File**: `src/snap/ui/miniature-display.ts`
  - Add `wmClass` parameter
  - Call `getSelectedLayoutId(wmClass)` to retrieve last selected layout ID
  - Compare each `layout.id` with `selectedLayoutId` to determine `isSelected` flag
  - Pass `isSelected` to `createLayoutButton()`

#### 5. Visual Highlighting Implementation
- **File**: `src/snap/snap-menu-constants.ts`
  - Add new color constant: `BUTTON_BG_COLOR_SELECTED = 'rgba(100, 150, 250, 0.7)'`
  - **Future Extension**: Can easily add `BUTTON_BG_COLOR_SELECTED_2`, `BUTTON_BG_COLOR_SELECTED_3`, etc. for gradient levels

- **File**: `src/snap/ui/layout-button.ts`
  - Import `BUTTON_BG_COLOR_SELECTED`
  - Add `isSelected: boolean` parameter to `createLayoutButton()`
    - **Future Extension**: Can change to `selectionLevel: number` (0=not selected, 1=most recent, 2=2nd recent, etc.)
  - Modify `getButtonStyle()` to accept `isSelected` parameter
  - Implement color priority logic:
    - If hovered: use `BUTTON_BG_COLOR_HOVER`
    - Else if selected: use `BUTTON_BG_COLOR_SELECTED`
    - Else: use `BUTTON_BG_COLOR`
  - **Design Note**: This priority logic is future-ready - simply add more conditions for selection levels
  - Update button initialization and event handlers

### File Modification Summary

**Phase 0 (Layout ID System)**:
- **New Files (3)**:
  - `src/snap/types/layout-setting.ts`
  - `src/snap/layout-hash-generator.ts`
  - `src/snap/layouts-repository.ts`
- **Modified Files (4)**:
  - `src/snap/types/layout.ts`
  - `src/snap/snap-menu-constants.ts`
  - `src/snap/snap-menu.ts`
  - `src/snap/test-layouts.ts`

**Phase 1-3 (History & Highlighting)**:
- **New Files (1)**:
  - `src/snap/layout-history.ts`
- **Modified Files (8)**:
  - `src/snap/window-snap-manager.ts`
  - `src/snap/snap-menu.ts` (already modified in Phase 0)
  - `src/snap/snap-menu-renderer.ts`
  - `src/snap/ui/category.ts`
  - `src/snap/ui/miniature-display.ts`
  - `src/snap/ui/layout-button.ts`
  - `src/snap/snap-menu-constants.ts` (already modified in Phase 0)
  - `src/types/gnome-shell-42.d.ts`

**Total**: 4 new files, 10 modified files

## Testing Plan

### Phase 0 Testing (Layout ID System)

#### Verify ID Uniqueness
- Load all layout settings
- Collect all generated layout IDs
- **Expected**: No duplicate IDs across entire catalog

#### Verify ID Stability
- Generate IDs for same settings twice
- **Expected**: IDs are identical (deterministic generation)

#### Verify Menu Still Works
- Open snap menu after Phase 0 changes
- **Expected**: All layouts display correctly, clicks work
- **Expected**: No visual regressions

### Manual Testing Scenarios

#### 1. Basic Functionality
- Open Firefox
- Drag to screen edge to show snap menu
- Select "Left Half" layout
- Close menu
- Verify window snaps correctly
- Reopen snap menu
- **Expected**: "Left Half" button highlighted in blue

#### 2. Per-Application Tracking
- Firefox: Select "Left Half"
- Terminal: Select "Right Half"
- Reopen Firefox snap menu
- **Expected**: "Left Half" highlighted
- Reopen Terminal snap menu
- **Expected**: "Right Half" highlighted

#### 3. Persistence Across Sessions
- Select layouts for multiple applications
- Restart GNOME Shell (Alt+F2, type 'r', Enter)
- Open snap menus for previously configured apps
- **Expected**: Selections preserved and highlighted

#### 4. Selection Updates
- Select "Left Half" for Firefox
- Verify "Left Half" highlighted
- Select "Right Half" for Firefox
- Reopen menu
- **Expected**: Only "Right Half" highlighted (old selection cleared)

#### 5. Edge Cases
- Open application without WM_CLASS
- **Expected**: No highlight, menu functions normally
- First time opening app
- **Expected**: No buttons highlighted
- Hover over selected button
- **Expected**: Hover color takes priority over selected color

### Quality Checks
- Run `npm run build` - Must succeed
- Run `npm run check` - Must pass
- Run `npm run test:run` - Must pass
- Visual inspection: Blue highlight clearly visible against gray background
- Performance: No noticeable lag when opening menu

## Implementation Timeline

### Phase 0: Layout ID System (Estimated: 4 points)
- Create layout settings configuration types (**no IDs in LayoutSetting**)
- Implement hash generator utility (coordinate-based for duplicate detection)
- **Create layouts repository** for persisting layouts
  - `importSettings()`: Convert settings → layouts (add UUID + hash) → save
  - `loadLayouts()`: Load persisted layouts (with UUID + hash)
  - Repository handles all conversion internally
- Update Layout type with `id` and `hash` fields
- Refactor DEFAULT_CATEGORIES to DEFAULT_LAYOUT_SETTINGS (pure settings, no IDs)
- Update menu initialization:
  - First launch: `layoutsRepository.importSettings(DEFAULT_LAYOUT_SETTINGS)`
  - All launches: `layoutsRepository.loadLayouts()` returns layouts with IDs
- Update test layouts
- Run quality checks (build, check, test)

### Phase 1: Core Infrastructure (Estimated: 2 points)
- Create `layout-history.ts` module with persistence (using layout IDs)
- Add type definitions for `get_wm_class()`
- Implement load/save functionality
- Unit test persistence mechanism

### Phase 2: Integration (Estimated: 3 points)
- Integrate history manager into WindowSnapManager
- Pass WM_CLASS through menu layers
- Add selection recording on layout application (using layout.id)
- Test with multiple applications

### Phase 3: Visual Implementation (Estimated: 2 points)
- Add selected color constant
- Modify button styling logic
- Implement color priority system
- Test hover and selection interactions

### Phase 4: Testing & Refinement (Estimated: 1 point)
- Execute all manual test scenarios
- Fix any issues discovered
- Run quality checks (build, check, test)
- Performance verification

**Total Estimated Effort**: 12 points

## Success Criteria

- Users can visually identify previously selected layouts in snap menu
- Layout history persists across GNOME Shell restarts
- Different applications maintain independent layout histories
- No performance degradation when opening snap menu
- All existing tests pass
- Code follows existing patterns and conventions

## Risks & Mitigations

### Risk 1: WM_CLASS Inconsistency
- **Risk**: Some applications may have inconsistent or missing WM_CLASS values
- **Mitigation**: Graceful degradation - if WM_CLASS is null, feature simply doesn't highlight (menu still works)

### Risk 2: File I/O Performance
- **Risk**: Saving to disk on every selection could cause lag
- **Mitigation**: JSON file is small (only stores wmClass → label mappings), similar to debug-config which has no performance issues

### Risk 3: Color Visibility
- **Risk**: Blue highlight might not be visible enough on some displays
- **Mitigation**: Using `rgba(100, 150, 250, 0.7)` provides good contrast against gray background `rgba(80, 80, 80, 0.6)`

## Future Enhancements

### Multi-Level History with Gradient Highlighting
- Track last n selections per application (not just the most recent)
- Visual gradient system: Most recent selection has darkest highlight, older selections progressively lighter
  - Example with n=3:
    - 1st (most recent): `rgba(100, 150, 250, 0.7)` - Darkest blue
    - 2nd: `rgba(100, 150, 250, 0.5)` - Medium blue
    - 3rd: `rgba(100, 150, 250, 0.3)` - Lightest blue
- **Data structure already supports this**: Using `string[]` from Phase 1 means no migration needed
- Implementation change: Simply remove the single-element constraint and add gradient color logic
- Benefits: Users can visualize their layout usage patterns and quickly access frequently used layouts

### Other Enhancements
- Option to clear layout history
- Settings UI to enable/disable history tracking
- Export/import layout preferences
- Per-workspace layout preferences
- Most frequently used layout analytics
