# SnapMenu Class Refactoring Plan

Status: Completed

## Overview

Refactor the large `SnapMenu` class (507 lines) into smaller, focused components following the Single Responsibility Principle. The current class handles too many concerns: lifecycle management, positioning, state management, layout selection, debug integration, and event handling.

## Current Situation

### Problems
- `SnapMenu` class is 507 lines with 7 different responsibilities
- Difficult to test individual components in isolation
- High coupling between UI rendering, state management, and business logic
- Hard to understand and maintain due to mixed concerns
- Difficult to extend or modify specific functionality

### Responsibilities Currently Mixed
- Menu lifecycle management (show/hide)
- Position calculation and layout
- Layout button state management (selection, highlighting)
- Auto-hide behavior control
- Debug panel integration
- Event handling
- Categories and layouts data management

## Goals

### Primary Goals
- Separate concerns into focused, single-responsibility classes
- Improve testability of individual components
- Reduce class size and complexity
- Maintain existing functionality and public API
- Make future extensions easier

### Non-Goals
- Changing the public API of `SnapMenu`
- Adding new features
- Performance optimization (unless critical issues found)
- Modifying existing UI appearance or behavior

## Architecture Decision

### Component Structure

```
SnapMenu (Coordinator - ~150 lines)
├── SnapMenuState (State Management)
├── SnapMenuPositionManager (Position & Dimensions)
├── SnapMenuLayoutSelector (Layout Selection & Highlighting)
├── SnapMenuDebugIntegration (Debug Panel Integration)
├── SnapMenuRenderer (UI Creation - already exists, extend)
└── SnapMenuAutoHide (Auto-hide Logic - already exists)
```

### Component Responsibilities

#### 1. SnapMenuState
**Purpose:** Centralized state management
- Stores: `categories`, `currentWmClass`, `originalCursorX/Y`, `menuX/Y`, `menuDimensions`
- Provides getters/setters with validation
- Emits events on state changes (optional, for future use)

#### 2. SnapMenuPositionManager
**Purpose:** Position calculation and menu placement
- `calculateMenuDimensions(categories, aspectRatio, showFooter)`
- `adjustPosition(cursorX, cursorY, screenDimensions, debugPanelEnabled)`
- `updateMenuPosition(container, x, y)`
- `updateDebugPanelPosition(debugPanel, menuBounds)`

#### 3. SnapMenuLayoutSelector
**Purpose:** Layout selection and highlighting
- `getLayoutAtPosition(x, y, layoutButtons)`
- `updateSelectedLayoutHighlight(layoutId, layoutButtons)`
- Manages `onLayoutSelected` callback
- Encapsulates button-to-layout mapping logic

#### 4. SnapMenuDebugIntegration
**Purpose:** Debug panel coordination
- Manages `DebugPanel` instance
- Handles debug config changes
- Integrates test layouts into categories
- Coordinates debug panel positioning with main menu

#### 5. SnapMenuRenderer (Extend Existing)
**Purpose:** UI element creation and rendering
- Keep existing: `createBackground()`, `createFooter()`, `createCategoriesView()`
- Add: `createMenuContainer()` to encapsulate container creation
- Add: `attachEventHandlers()` to setup button events
- Manage `layoutButtons` map internally

#### 6. SnapMenu (Coordinator)
**Purpose:** Orchestrate components and provide public API
- Public methods: `show()`, `hide()`, `isVisible()`, `updatePosition()`, `setOnLayoutSelected()`
- Delegates to appropriate components
- Manages component lifecycle
- Handles overall flow coordination

## Implementation Plan

### Phase 1: Create New Component Classes
**Estimated effort:** 3 points

- Create `snap-menu-state.ts`
  - Define `SnapMenuState` class
  - Implement state properties and getters/setters
  - Add state validation logic

- Create `snap-menu-position-manager.ts`
  - Move `calculateMenuDimensions()` method
  - Create `adjustPosition()` wrapper around `adjustMenuPosition()`
  - Add position update methods

- Create `snap-menu-layout-selector.ts`
  - Move `getLayoutAtPosition()` method
  - Move `updateSelectedLayoutHighlight()` method
  - Add `onLayoutSelected` callback management

- Create `snap-menu-debug-integration.ts`
  - Extract debug panel initialization logic
  - Move test layout integration logic
  - Add debug config change handlers

### Phase 2: Extend SnapMenuRenderer
**Estimated effort:** 2 points

- Add `createMenuContainer()` function
  - Extract container creation logic from `show()`
  - Make styling configurable via parameters

- Add `attachEventHandlers()` function
  - Setup button hover events
  - Setup button click events
  - Return event IDs for cleanup

- Move `layoutButtons` management into renderer
  - Return buttons map from `createCategoriesView()`
  - Already implemented, verify completeness

### Phase 3: Refactor SnapMenu Class
**Estimated effort:** 4 points

- Initialize component instances in constructor
  - Create `SnapMenuState` instance
  - Create `SnapMenuPositionManager` instance
  - Create `SnapMenuLayoutSelector` instance
  - Create `SnapMenuDebugIntegration` instance
  - Keep existing `SnapMenuAutoHide` instance

- Refactor `show()` method
  - Use `state.updateCursor(x, y, wmClass)`
  - Use `positionManager.calculateDimensions()`
  - Use `positionManager.adjustPosition()`
  - Use `debugIntegration.mergeTestCategories()`
  - Use `renderer.createMenuContainer()`
  - Delegate to components instead of inline logic

- Refactor `hide()` method
  - Delegate cleanup to components
  - Use `state.reset()` to clear state

- Refactor `updatePosition()` method
  - Use `positionManager.adjustPosition()`
  - Use `positionManager.updateMenuPosition()`
  - Use `debugIntegration.updateDebugPanelPosition()`

- Refactor `getLayoutAtPosition()` method
  - Delegate to `layoutSelector.getLayoutAtPosition()`

- Refactor `updateSelectedLayoutHighlight()` method
  - Delegate to `layoutSelector.updateSelectedLayoutHighlight()`

### Phase 4: Testing & Validation
**Estimated effort:** 2 points

- Manual testing
  - Verify menu show/hide behavior
  - Test layout selection and highlighting
  - Test menu positioning with debug panel
  - Test auto-hide functionality
  - Test with different screen sizes

- Integration testing
  - Test with window-snap-manager integration
  - Test layout history integration
  - Verify no regression in existing features

- Code review
  - Check separation of concerns
  - Verify no circular dependencies
  - Review component interfaces

### Phase 5: Documentation & Cleanup
**Estimated effort:** 1 point

- Update comments and documentation
  - Add JSDoc comments to new classes
  - Document component responsibilities
  - Update architecture diagrams if needed

- Code cleanup
  - Remove unused imports
  - Fix any linting issues
  - Verify all files end with newline

- Run quality checks
  - `npm run build`
  - `npm run check`
  - `npm run test:run`

## Technical Considerations

### Dependency Management
- Keep dependencies unidirectional: `SnapMenu` → Components
- Components should not depend on each other directly
- Pass data between components through `SnapMenu` coordinator

### Backward Compatibility
- Maintain exact same public API
- No changes to method signatures
- No changes to behavior from outside perspective

### Type Safety
- Use TypeScript interfaces for component contracts
- Define clear input/output types
- Avoid `any` types where possible

### Error Handling
- Each component handles its own errors
- Propagate critical errors to `SnapMenu`
- Log errors appropriately with context

## Timeline Estimation

Total estimated effort: **12 points**

- Phase 1 (Create Components): 3 points
- Phase 2 (Extend Renderer): 2 points
- Phase 3 (Refactor SnapMenu): 4 points
- Phase 4 (Testing): 2 points
- Phase 5 (Documentation): 1 point

## Success Criteria

- `SnapMenu` class reduced to ~150 lines (70% reduction)
- Each new component class under 200 lines
- All existing tests pass
- No changes to public API
- `npm run build && npm run check && npm run test:run` passes
- Manual testing confirms no regressions
- Code review approved

## Risks & Mitigations

### Risk: Breaking existing functionality
**Mitigation:** Extensive manual testing, keep public API unchanged, incremental refactoring

### Risk: Introducing circular dependencies
**Mitigation:** Careful dependency design, unidirectional flow through coordinator

### Risk: Over-engineering
**Mitigation:** Keep components simple, only extract clear responsibilities, avoid premature abstractions

### Risk: Testing difficulty
**Mitigation:** Design components for testability, use dependency injection where appropriate

## Future Improvements

After this refactoring, the following improvements become easier:

- Unit testing individual components in isolation
- Adding new menu features without modifying multiple concerns
- Replacing positioning strategy without affecting other logic
- Implementing different layout selection strategies
- Adding animation or transition effects
- Supporting multiple menu instances
