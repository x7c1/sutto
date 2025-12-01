# Layer Separation Refactoring

## Overview

Refactor the snap menu codebase to clearly separate data structures from UI widgets by introducing explicit layer boundaries. This eliminates confusion between data types and UI types, improving code maintainability and clarity.

## Current Situation

The codebase has implicit layer separation but lacks clear boundaries:

```
src/snap/
├── snap-menu-types.ts          // Data structures (Layout, LayoutGroup, LayoutGroupCategory)
├── snap-menu-renderer.ts       // UI generation and rendering logic (mixed)
├── snap-menu-constants.ts      // Constants
└── ...
```

**Problems:**
- Data structures and UI widget creation are in separate files, but the relationship is implicit
- Function names like `createMiniatureDisplay()` don't clearly indicate they produce UI widgets
- No explicit type distinction between data layer and UI layer
- Terminology confusion: same name used for both data structure and UI widget

### Current Mapping (Implicit)

```
Data Structure          →  UI Widget
─────────────────────────────────────────
Layout                 →  St.Button (layout button)
LayoutGroup            →  St.Widget (miniature display)
LayoutGroupCategory    →  St.BoxLayout (category container)
```

## Goals

Make the layer separation **explicit and enforceable**:

1. **Clear file/module boundaries** between data and UI layers
2. **Naming conventions** that distinguish data from UI
3. **Type safety** to prevent mixing layers
4. **Easy to understand** for new developers

## Design Approach

### Recommended: Option 2 (Naming + File Separation)

Minimal changes to existing code while achieving clear separation.

#### File Structure

```
src/snap/
├── types/                          // Data structure layer
│   ├── index.ts                   // Re-export all types
│   ├── layout.ts                  // Layout interface
│   ├── layout-group.ts            // LayoutGroup interface
│   └── layout-group-category.ts   // LayoutGroupCategory interface
├── ui/                             // UI widget layer
│   ├── index.ts                   // Re-export all widget creators
│   ├── layout-button.ts           // createLayoutButton() + private helpers
│   ├── miniature-display.ts       // createMiniatureDisplay()
│   └── category-container.ts      // createCategoryContainer()
├── snap-menu-renderer.ts          // Orchestration (uses both layers)
├── snap-menu-constants.ts         // Constants
└── ...
```

#### Naming Rationale

**Current codebase names → Proposed refactored names:**
- `SnapLayout` → `Layout` (snap- prefix is redundant in snap context)
- `SnapLayoutGroup` → `LayoutGroup` (snap- prefix is redundant)
- `MiniatureDisplayCategory` → `LayoutGroupCategory` (removes UI concept "miniature display", describes actual structure)

**Why remove "snap-" prefix:**
- All types are already in the `src/snap/` directory and snap context
- Shorter, cleaner names without losing clarity
- Consistent with other projects (e.g., React doesn't prefix every component with "React")

**Why "LayoutGroupCategory" instead of "MiniatureDisplayCategory":**
- "Miniature Display" is a UI presentation concept, not a data structure
- The type actually contains `layoutGroups: LayoutGroup[]`
- "LayoutGroupCategory" accurately describes the data structure hierarchy

#### Naming Conventions

**Data Layer** (`src/snap/types/`):
- Interface names: `Layout`, `LayoutGroup`, `LayoutGroupCategory`
- Pure data structures with no UI dependencies
- No imports from `St`, `Clutter`, or GNOME Shell UI libraries

**UI Layer** (`src/snap/ui/`):
- Function names: `createLayoutButton()`, `createMiniatureDisplay()`, `createCategoryContainer()`
- Returns GNOME Shell UI widgets (`St.Button`, `St.Widget`, `St.BoxLayout`)
- Takes data structures as input parameters
- Clear input/output relationship: Data → UI
- Private helper functions are kept within their respective files (no shared helpers file)
- Can import from `types/`, `snap-menu-constants.ts`, `layout-expression/`, and `debug-config.ts`

**Orchestration Layer** (`snap-menu-renderer.ts` - remains after refactoring):
- Imports from both `types/` and `ui/`
- Coordinates rendering flow
- Handles event management
- Retains high-level functions: `createBackground()`, `createFooter()`, `createCategoriesContainer()`, `createDisplaysContainer()`
- These functions orchestrate lower-level UI components from `ui/`

### Alternative Approaches (Not Recommended for Now)

#### Option 1: Deep Folder Separation
- Pros: Very clear separation
- Cons: More files to manage, higher migration effort

#### Option 3: Type System Enforcement
- Pros: Compile-time safety
- Cons: Complex type definitions, TypeScript overhead

## Implementation Decisions

### Helper Functions Placement

**Decision: Keep all helper functions as private functions within `ui/layout-button.ts`**

**Investigation Results:**
After analyzing the actual code in `snap-menu-renderer.ts`, all three helper functions are **only** used by `createLayoutButton()`:
- `resolveLayoutValue()` - Used 3 times in `createLayoutButton()` and once in `calculateButtonWidth()`
- `calculateButtonWidth()` - Used 1 time in `createLayoutButton()`
- `getButtonStyle()` - Used 3 times in `createLayoutButton()`

No other functions use these helpers, confirming they should remain private to the layout-button module.

**Rationale:**
- ✅ No shared code between multiple files - no need for a separate helpers file
- ✅ Keeps functions close to their usage (better code locality)
- ✅ Avoids creating vague "helpers" files that become dumping grounds
- ✅ Private functions are not exposed in the public API
- ✅ Simpler file structure with fewer files

**Implementation:**
All three functions will be moved to `ui/layout-button.ts` as private (non-exported) functions, placed before `createLayoutButton()`.

### Orchestration Functions Scope

**Decision: Keep high-level orchestration in `snap-menu-renderer.ts`**

**Rationale:**
- Functions that coordinate multiple UI components belong in the orchestration layer
- These functions handle event management and complex interactions between components
- Moving them to `ui/` would blur the distinction between primitive components and composition

**Functions remaining in `snap-menu-renderer.ts`:**
- `createBackground()` - Creates modal overlay with complex event handling
- `createFooter()` - Simple component, but serves orchestration purpose
- `createCategoriesContainer()` - Orchestrates category layout and scrolling behavior
- `createDisplaysContainer()` - Legacy function for backward compatibility

**Functions moved to `ui/`:**
- `createLayoutButton()` - Primitive UI component
- `createMiniatureDisplay()` - Primitive UI component
- `createCategoryContainer()` - Primitive UI component

### Import Strategy

**Decision: Use clean barrel exports with private helper functions**

**Pattern:**
```typescript
// ui/index.ts - Public API (barrel export)
export { createLayoutButton } from './layout-button';
export { createMiniatureDisplay } from './miniature-display';
export { createCategoryContainer } from './category-container';

// ui/layout-button.ts - Component implementation
// Private helper functions (NOT exported)
function resolveLayoutValue(...) { }
function calculateButtonWidth(...) { }
function getButtonStyle(...) { }

// Public API (exported)
export function createLayoutButton(...) {
    // Uses private helpers internally
}
```

**Benefits:**
- ✅ Clear public API through barrel exports
- ✅ Helper functions remain private within their module
- ✅ Consumers import from `ui/` without knowing internal structure
- ✅ No vague "helpers" file to maintain
- ✅ Easy to refactor internal implementations later

## Implementation Plan

### Phase 1: Create Layer Directories
- Create `src/snap/types/` directory
- Create `src/snap/ui/` directory
- Create `index.ts` files for re-exports

### Phase 2: Move Data Structures to types/
- Move and rename `SnapLayout` → `Layout` interface to `types/layout.ts`
- Move and rename `SnapLayoutGroup` → `LayoutGroup` interface to `types/layout-group.ts`
- Move and rename `MiniatureDisplayCategory` → `LayoutGroupCategory` interface to `types/layout-group-category.ts`
- Create `types/index.ts` to re-export all types
- Update imports in existing files to use new names

### Phase 3: Extract UI Widget Creators to ui/
- Extract `createLayoutButton()` to `ui/layout-button.ts`
  - Include private helper functions: `resolveLayoutValue()`, `calculateButtonWidth()`, `getButtonStyle()`
  - These helpers are NOT exported (private to the module)
- Extract `createMiniatureDisplay()` to `ui/miniature-display.ts`
- Extract `createCategoryContainer()` to `ui/category-container.ts`
- Create `ui/index.ts` to re-export only the public widget creator functions
- Update imports in `snap-menu-renderer.ts`

### Phase 4: Update snap-menu-renderer.ts
- Import from `types/` for data structures
- Import from `ui/` for widget creators
- Keep orchestration logic (combining widgets, event management)
- Retain high-level orchestration functions:
  - `createBackground()` - Creates modal background overlay
  - `createFooter()` - Creates footer with instructions
  - `createCategoriesContainer()` - Orchestrates category layout (calls `createCategoryContainer()`)
  - `createDisplaysContainer()` - Legacy layout orchestration
- Verify all imports are correct

### Phase 5: Update Other Files
- Update `snap-menu.ts` to import from new locations and use new type names
- Update `snap-menu-constants.ts` to import from new locations and use new type names
  - `DEFAULT_LAYOUT_GROUPS: SnapLayoutGroup[]` → `DEFAULT_LAYOUT_GROUPS: LayoutGroup[]`
  - `DEFAULT_CATEGORIES: MiniatureDisplayCategory[]` → `DEFAULT_CATEGORIES: LayoutGroupCategory[]`
- Update `test-layouts.ts` to import from new locations and use new type names
  - `getTestLayoutGroups(): SnapLayoutGroup[]` → `getTestLayoutGroups(): LayoutGroup[]`
- **Note:** `debug-panel.ts` does NOT need updates (uses type inference, no direct type imports)
- Ensure all files compile without errors

### Phase 6: Documentation and Validation
- Add comments explaining layer boundaries
- Update CLAUDE.md or developer docs if needed
- Run `npm run build && npm run check && npm run test:run`
- Verify no regressions in functionality

## Technical Considerations

### Import Paths

**Before:**
```typescript
import type { SnapLayout, SnapLayoutGroup, MiniatureDisplayCategory } from './snap-menu-types';
import { createMiniatureDisplay } from './snap-menu-renderer';
```

**After:**
```typescript
import type { Layout, LayoutGroup, LayoutGroupCategory } from './types';
import { createLayoutButton, createMiniatureDisplay, createCategoryContainer } from './ui';
```

### Dependency Rules

**Strict Layer Boundaries:**
- `types/` → No dependencies on UI or orchestration (pure data structures)
- `ui/` → Can import from:
  - `types/` (data structures)
  - `snap-menu-constants.ts` (constants like `BUTTON_HEIGHT`, `MINIATURE_SPACING`)
  - `layout-expression/` (expression parsing and evaluation)
  - `debug-config.ts` (debug configuration)
  - GNOME Shell libraries (`St`, `Clutter`)
- `snap-menu-renderer.ts` → Can import from both `types/` and `ui/`

### Backward Compatibility

For gradual migration, keep temporary re-exports with renamed types:

```typescript
// snap-menu-types.ts (deprecated, to be removed after migration)
// Re-export with old names for backward compatibility
export type { Layout as SnapLayout } from './types/layout';
export type { LayoutGroup as SnapLayoutGroup } from './types/layout-group';
export type { LayoutGroupCategory as MiniatureDisplayCategory } from './types/layout-group-category';
```

This allows existing code to continue working during migration, then can be removed once all files are updated to use new names.

### File Size Considerations

Each file should contain only one primary entity:
- `types/layout.ts`: ~8 lines (Layout interface definition)
- `types/layout-group.ts`: ~5 lines (LayoutGroup interface definition)
- `types/layout-group-category.ts`: ~5 lines (LayoutGroupCategory interface definition)
- `ui/layout-button.ts`: ~105 lines (createLayoutButton + 3 private helpers)
- `ui/miniature-display.ts`: ~95 lines (createMiniatureDisplay function)
- `ui/category-container.ts`: ~65 lines (createCategoryContainer function)

After extraction, `snap-menu-renderer.ts` will be reduced from 487 lines to approximately 190 lines (retaining orchestration functions only).

This is a reasonable size and improves code navigation.

## Success Criteria

- [ ] `types/` directory created with all three data structure interfaces (Layout, LayoutGroup, LayoutGroupCategory)
- [ ] `ui/` directory created with all three widget creator functions
- [ ] Each layer has `index.ts` for clean re-exports
- [ ] All types renamed consistently (removed snap- prefix, LayoutGroupCategory instead of MiniatureDisplayCategory)
- [ ] `snap-menu-renderer.ts` imports from both layers correctly with new type names
- [ ] All other files (snap-menu.ts, debug-panel.ts, snap-menu-constants.ts, test-layouts.ts) updated to use new import paths and type names
- [ ] No circular dependencies between layers
- [ ] All type checks pass
- [ ] All tests pass
- [ ] Code passes `npm run build && npm run check && npm run test:run`
- [ ] No regressions in snap menu functionality

## Relationship to Other Issues

**Prerequisite:**
- ✅ Issue #8 (Miniature Display Categories) has been completed
  - `MiniatureDisplayCategory` interface exists and is in use (will be renamed to `LayoutGroupCategory`)
  - Category-based rendering is implemented and working

**Benefits for Future Work:**
- Clearer boundaries make future refactoring easier
- New developers can quickly understand the architecture
- Reduces naming confusion between data and UI

## Timeline Estimate

**2 points** - Straightforward refactoring with clear scope and minimal logic changes
