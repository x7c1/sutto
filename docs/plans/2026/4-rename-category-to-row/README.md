# Rename LayoutCategory to DisplayGroupsRow

Status: Completed

## Overview

Rename `LayoutCategory` to `DisplayGroupsRow` throughout the codebase to better reflect its actual purpose. The current name "category" is misleading - it represents a horizontal row of DisplayGroups (plural), not a categorical grouping.

## Background

The current naming issue:
- `LayoutCategory` suggests a hierarchical categorization system
- In reality, it only represents DisplayGroups arranged horizontally (in a row)
- DisplayGroups within a row may or may not be related to each other
- The name doesn't reflect the actual implementation or usage

## Goals

- Rename types to accurately reflect their purpose
- Improve code readability and maintainability
- Update all related variable names, function names, and comments
- Maintain functionality while improving naming clarity

## Scope

### Type Definitions (3 files)

**src/app/types/layout-category.ts**
- Rename interface: `LayoutCategory` → `DisplayGroupsRow`
- Update file documentation

**src/app/types/layout-setting.ts**
- Rename interface: `LayoutCategoryWithDisplayGroups` → `DisplayGroupsRowSetting`
- Rename property: `layoutCategories` → `displayGroupRows` in `LayoutConfiguration`
- Update comments

**src/app/types/index.ts**
- Update export: `LayoutCategory` → `DisplayGroupsRow`

### Repository Layer (1 file)

**src/app/repository/layouts.ts**
- Update imports: `LayoutCategory`, `LayoutCategoryWithDisplayGroups`
- Rename functions:
  - `settingToCategoryWithDisplayGroups` → `settingToDisplayGroupsRow`
  - `configurationToCategories` → `configurationToDisplayGroupRows`
  - `isValidLayoutCategoryData` → `isValidDisplayGroupRowsData`
  - `loadLayoutsAsCategories` → `loadLayoutsAsDisplayGroupRows`
  - `saveCategoriesWithDisplayGroups` → `saveDisplayGroupRows`
- Rename variables: `categories` → `rows`, `categorySetting` → `rowSetting`
- Update ~20 comments

### Main Panel Layer (4 files)

**src/app/main-panel/state.ts**
- Update import
- Rename property: `categories` → `displayGroupRows`
- Rename methods:
  - `getCategories()` → `getDisplayGroupRows()`
  - `setCategories()` → `setDisplayGroupRows()`
- Update documentation and comments

**src/app/main-panel/position-manager.ts**
- Update import (including `CATEGORY_SPACING` → `ROW_SPACING`)
- Rename parameter: `categoriesToRender` → `rowsToRender` in `calculatePanelDimensions()`
- Rename variables: `category` → `row`, `maxCategoryWidth` → `maxRowWidth`, etc.
- Update all uses of `CATEGORY_SPACING` to `ROW_SPACING`
- Update ~10 comments

**src/app/main-panel/renderer.ts**
- Update import
- Rename function: `createCategoriesViewWithDisplayGroups` → `createDisplayGroupRowsView`
- Rename parameters and variables: `categories` → `rows`, `category` → `row`, etc.
- Update ~8 comments

**src/app/main-panel/index.ts**
- Update import
- Update all method calls to use new function names
- Rename variables: `categories` → `rows`
- Update comments

### Constants (1 file)

**src/app/constants.ts**
- Update import
- Rename property: `layoutCategories` → `displayGroupRows` in `DEFAULT_LAYOUT_CONFIGURATION`
- Rename constant: `CATEGORY_SPACING` → `ROW_SPACING`
- Update all references to `CATEGORY_SPACING` throughout the codebase
- Update comments

## Implementation Plan

- Update type definition files first (types/layout-category.ts, types/layout-setting.ts, types/index.ts)
- Update repository layer (repository/layouts.ts)
- Update main panel state management (main-panel/state.ts)
- Update main panel position calculations (main-panel/position-manager.ts)
- Update main panel rendering (main-panel/renderer.ts)
- Update main panel controller (main-panel/index.ts)
- Update constants (constants.ts)
- Run build, type check, and tests
- Fix any errors found
- Manual testing with the extension

## Testing Strategy

- Run `npm run build && npm run check && npm run test:run`
- Verify no build errors
- Verify no type errors
- Verify all tests pass
- Manual testing:
  - Load the extension in GNOME Shell
  - Verify layout panel displays correctly
  - Verify DisplayGroups render in horizontal rows
  - Verify layout selection works correctly
  - Verify no runtime errors in logs

## Non-Goals

- Not changing the visual layout or behavior
- Not changing the runtime data structure (only naming)
- Not adding new features

## Timeline Estimate

- Type definitions: 1 point
- Repository layer: 2 points
- Main panel layer: 3 points
- Constants and testing: 1 point
- Total: ~7 points

## Notes

- This is a pure refactoring task with no functional changes
- TypeScript's type system will help catch all usage locations
- All "category" terminology will be replaced with "row" for consistency
- Consider this an opportunity to improve code documentation as well
