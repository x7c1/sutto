# Rename DisplayGroup to Space

## Overview

Rename `DisplayGroup` to `Space` throughout the codebase to better reflect its conceptual meaning. A "Space" represents a virtual desktop or workspace that contains multiple displays (monitors), which aligns with the established "miniature space" feature terminology.

## Background

The current naming issue:
- `DisplayGroup` suggests a grouping of display elements
- In reality, it represents a virtual desktop/workspace concept that spans multiple monitors
- The term "space" is already used in the "miniature space" feature
- Aligning terminology with "space" improves conceptual clarity and consistency

## Goals

- Rename types to accurately reflect the "space" concept
- Align naming with existing "miniature space" feature terminology
- Improve code readability and maintainability
- Update all related file names, variable names, function names, and comments
- Maintain functionality while improving naming clarity

## Scope

### Type Definitions (3 files)

**src/app/types/display-group.ts → src/app/types/space.ts**
- Rename interface: `DisplayGroup` → `Space`
- Update file documentation
- Rename file

**src/app/types/display-groups-row.ts → src/app/types/spaces-row.ts**
- Rename interface: `DisplayGroupsRow` → `SpacesRow`
- Update import: `DisplayGroup` → `Space`
- Update property: `displayGroups` → `spaces`
- Update file documentation
- Rename file

**src/app/types/layout-setting.ts**
- Rename interface: `DisplayGroupSetting` → `SpaceSetting`
- Rename interface: `DisplayGroupsRowSetting` → `SpacesRowSetting`
- Rename property: `displayGroups` → `spaces` in `SpacesRowSetting`
- Update comments referencing "Display Group" → "Space"

**src/app/types/index.ts**
- Update export: `DisplayGroup` → `Space`
- Update export: `DisplayGroupsRow` → `SpacesRow`
- Update import paths for renamed files

### UI Layer (2 files)

**src/app/ui/display-group-dimensions.ts → src/app/ui/space-dimensions.ts**
- Rename interface: `DisplayGroupDimensions` → `SpaceDimensions`
- Rename function: `calculateDisplayGroupDimensions` → `calculateSpaceDimensions`
- Rename function: `calculateBoundingBoxForDisplayGroup` → `calculateBoundingBoxForSpace`
- Rename parameter: `displayGroup` → `space`
- Update comments
- Rename file

**src/app/ui/miniature-space.ts**
- Update import: `DisplayGroup` → `Space`
- Update import: `calculateDisplayGroupDimensions` → `calculateSpaceDimensions`
- Rename function: `calculateBoundingBoxForDisplayGroup` → `calculateBoundingBoxForSpace`
- Rename parameter: `displayGroup` → `space` throughout the file
- Update comments

### Repository Layer (1 file)

**src/app/repository/layouts.ts**
- Update imports: `DisplayGroup`, `DisplayGroupsRow`, `DisplayGroupSetting`, `DisplayGroupsRowSetting`
- Rename functions:
  - `settingToDisplayGroup` → `settingToSpace`
  - `settingToDisplayGroupsRow` → `settingToSpacesRow`
  - `configurationToDisplayGroupRows` → `configurationToSpacesRows`
  - `isValidDisplayGroupRowsData` → `isValidSpacesRowsData`
  - `loadLayoutsAsDisplayGroupRows` → `loadLayoutsAsSpacesRows`
  - `saveDisplayGroupRows` → `saveSpacesRows`
- Rename parameters and variables: `displayGroup` → `space`, `displayGroups` → `spaces`
- Update comments referencing "Display Group" → "Space"

### Main Panel Layer (4 files)

**src/app/main-panel/state.ts**
- Update import: `DisplayGroupsRow` → `SpacesRow`
- Rename property: `displayGroupRows` → `spacesRows`
- Rename methods:
  - `getDisplayGroupRows()` → `getSpacesRows()`
  - `setDisplayGroupRows()` → `setSpacesRows()`
- Update documentation and comments

**src/app/main-panel/position-manager.ts**
- Update imports: `DisplayGroupsRow` → `SpacesRow`
- Update import: `calculateDisplayGroupDimensions` → `calculateSpaceDimensions`
- Rename parameter: `rowsToRender` (no change, but update type reference)
- Rename variables: `displayGroup` → `space`, `maxDisplayGroupHeight` → `maxSpaceHeight`
- Update constant usage if exists: `DISPLAY_GROUP_SPACING` → `SPACE_SPACING`
- Update comments

**src/app/main-panel/renderer.ts**
- Update import: `DisplayGroupsRow` → `SpacesRow`
- Rename interface: `DisplayGroupRowsView` → `SpacesRowView`
- Rename function: `createDisplayGroupRowsView` → `createSpacesRowView`
- Rename parameters and variables: `displayGroup` → `space`
- Update comments

**src/app/main-panel/index.ts**
- Update imports: `DisplayGroupsRow` → `SpacesRow`, `loadLayoutsAsDisplayGroupRows` → `loadLayoutsAsSpacesRows`
- Update import: `createDisplayGroupRowsView` → `createSpacesRowView`
- Update all method calls to use new function names
- Rename variables: `rows` (type reference needs updating)
- Update comments

### Constants (if applicable)

**src/app/constants.ts** (if it contains Display Group related constants)
- Rename constant if exists: `DISPLAY_GROUP_SPACING` → `SPACE_SPACING`
- Update property references: `displayGroups` → `spaces`
- Update comments

### Documentation (2 files)

**docs/concepts/space.md**
- Update code examples: `DisplayGroupSetting` → `SpaceSetting`
- Update all references from "Display Group" to "Space"

**docs/issues/2026/3-multi-monitor-support/plan.md**
- This is historical documentation, no changes needed (or add note about renaming)

**docs/issues/2026/4-rename-category-to-row/plan.md**
- This is historical documentation, no changes needed (or add note about renaming)

## Implementation Plan

1. Update type definition files first:
   - Rename `src/app/types/display-group.ts` → `space.ts`
   - Rename `src/app/types/display-groups-row.ts` → `spaces-row.ts`
   - Update `src/app/types/layout-setting.ts`
   - Update `src/app/types/index.ts`

2. Update UI layer files:
   - Rename `src/app/ui/display-group-dimensions.ts` → `space-dimensions.ts`
   - Update `src/app/ui/miniature-space.ts`

3. Update repository layer:
   - Update `src/app/repository/layouts.ts`

4. Update main panel layer:
   - Update `src/app/main-panel/state.ts`
   - Update `src/app/main-panel/position-manager.ts`
   - Update `src/app/main-panel/renderer.ts`
   - Update `src/app/main-panel/index.ts`

5. Update constants if applicable:
   - Update `src/app/constants.ts`

6. Update documentation:
   - Update `docs/concepts/space.md`

7. Run build, type check, and tests:
   - `npm run build && npm run check && npm run test:run`
   - Fix any errors found

8. Manual testing with the extension

## Testing Strategy

- Run `npm run build && npm run check && npm run test:run`
- Verify no build errors
- Verify no type errors
- Verify all tests pass
- Manual testing:
  - Load the extension in GNOME Shell
  - Verify layout panel displays correctly
  - Verify Spaces render correctly in rows
  - Verify layout selection works correctly
  - Verify miniature space feature works correctly
  - Verify no runtime errors in logs

## Non-Goals

- Not changing the visual layout or behavior
- Not changing the runtime data structure (only naming)
- Not adding new features
- Not changing historical documentation (plan.md files in other issues)

## Notes

- This is a pure refactoring task with no functional changes
- TypeScript's type system will help catch all usage locations
- All "DisplayGroup" / "Display Group" terminology will be replaced with "Space" for consistency
- This aligns with the conceptual definition documented in `docs/concepts/space.md`
- The term "space" already exists in the codebase ("miniature space"), so this change improves consistency
- File renames will require updating all import statements
