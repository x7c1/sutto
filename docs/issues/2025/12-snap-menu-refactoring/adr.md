# Architecture Decision Record: SnapMenu Refactoring Approach

## Status

Proposed

## Context

The `SnapMenu` class has grown to 507 lines with 7 different responsibilities, making it difficult to maintain, test, and extend. We need to refactor it to improve code quality while maintaining existing functionality.

## Decision Drivers

- **Maintainability:** Easier to understand and modify
- **Testability:** Ability to test components in isolation
- **Extensibility:** Easier to add new features
- **Backward Compatibility:** No breaking changes to public API
- **Complexity:** Avoid over-engineering
- **Team Familiarity:** Work with existing patterns in codebase

## Options Considered

### Option 1: Component-Based Refactoring (SELECTED)

**Description:** Split into 5 focused component classes coordinated by a thin `SnapMenu` class.

**Structure:**
```
SnapMenu (Coordinator ~150 lines)
├── SnapMenuState
├── SnapMenuPositionManager
├── SnapMenuLayoutSelector
├── SnapMenuDebugIntegration
└── SnapMenuRenderer (extend existing)
```

**Pros:**
- Clear separation of concerns
- Each component has single responsibility
- Easy to test individual components
- Follows existing patterns (e.g., `SnapMenuRenderer` already exists)
- Moderate complexity increase (5 new files)
- Components are reusable independently
- Natural extension points for future features

**Cons:**
- More files to navigate (6 total instead of 1)
- Need to understand component interactions
- Slight overhead in method delegation
- Initial refactoring effort required

**Complexity:** Medium
**Maintainability:** High
**Testability:** High
**Extensibility:** High

---

### Option 2: Functional Decomposition

**Description:** Extract methods into separate modules as pure functions, keep `SnapMenu` as the main class.

**Structure:**
```
snap-menu.ts (main class ~250 lines)
snap-menu-positioning.ts (functions)
snap-menu-rendering.ts (functions)
snap-menu-state.ts (functions)
```

**Pros:**
- Simpler mental model (functions vs classes)
- Less boilerplate code
- Easy to test pure functions
- Fewer files than Option 1
- Less drastic change from current structure

**Cons:**
- State management becomes awkward (need to pass state everywhere)
- No encapsulation of related data and behavior
- `SnapMenu` still large (~250 lines)
- Harder to maintain state consistency
- Functions may need many parameters
- Less clear ownership of responsibilities

**Complexity:** Low
**Maintainability:** Medium
**Testability:** High
**Extensibility:** Medium

---

### Option 3: Service Layer Pattern

**Description:** Create a `SnapMenuService` with dependency injection and service classes.

**Structure:**
```
SnapMenu (thin facade ~100 lines)
└── SnapMenuService (coordinator ~200 lines)
    ├── IPositionService
    ├── IStateService
    ├── IRenderService
    ├── ILayoutService
    └── IDebugService
```

**Pros:**
- Maximum testability with dependency injection
- Very clean separation via interfaces
- Easy to mock services in tests
- Industry-standard pattern
- Flexible for future changes

**Cons:**
- Over-engineered for current needs
- Too much abstraction overhead
- Requires learning dependency injection pattern
- Many interface definitions
- Overkill for a GNOME Shell extension
- Doesn't match existing codebase patterns

**Complexity:** High
**Maintainability:** Medium
**Testability:** Very High
**Extensibility:** Very High

---

### Option 4: Minimal Refactoring (Extract Methods)

**Description:** Keep single `SnapMenu` class, just extract private methods and improve organization.

**Structure:**
```
snap-menu.ts (single file ~500 lines)
  - Organized into sections with comments
  - Private methods extracted
  - Better method organization
```

**Pros:**
- Minimal change
- No new files
- Easy to understand for beginners
- Quick to implement
- No risk of breaking functionality

**Cons:**
- Still a large class (500 lines)
- Mixed responsibilities remain
- Hard to test in isolation
- Doesn't solve the fundamental problem
- Future growth still problematic
- No real improvement in maintainability

**Complexity:** Very Low
**Maintainability:** Low
**Testability:** Low
**Extensibility:** Low

---

### Option 5: State Machine Pattern

**Description:** Model menu as a state machine with explicit states and transitions.

**Structure:**
```
SnapMenu (state machine ~200 lines)
├── MenuState (enum: Hidden, Showing, Visible, Hiding)
├── StateTransitions
└── State-specific handlers
```

**Pros:**
- Clear state modeling
- Explicit state transitions
- Good for complex lifecycle management
- Prevents invalid states

**Cons:**
- Overkill for current simple lifecycle (just show/hide)
- Adds complexity where not needed
- Doesn't address size issue
- Not common pattern in GNOME Shell extensions
- State machine overhead for simple cases

**Complexity:** Medium
**Maintainability:** Medium
**Testability:** Medium
**Extensibility:** Low

---

## Decision

**Selected: Option 1 - Component-Based Refactoring**

## Rationale

Option 1 provides the best balance of:

1. **Clear Separation of Concerns:** Each component has a single, well-defined responsibility
2. **Testability:** Components can be tested in isolation
3. **Maintainability:** Smaller files are easier to understand and modify
4. **Extensibility:** Natural extension points for future features
5. **Existing Patterns:** Follows the pattern already established with `SnapMenuRenderer`
6. **Reasonable Complexity:** Not over-engineered, but properly structured

### Why Not Others?

- **Option 2 (Functional):** State management becomes awkward, doesn't reduce `SnapMenu` size enough
- **Option 3 (Service Layer):** Over-engineered for a GNOME Shell extension, too much abstraction
- **Option 4 (Minimal):** Doesn't solve the fundamental problem of mixed responsibilities
- **Option 5 (State Machine):** Adds unnecessary complexity for simple show/hide lifecycle

### Key Design Decisions

1. **Coordinator Pattern:** `SnapMenu` acts as coordinator, delegating to components
   - Keeps public API unchanged
   - Central point for orchestration
   - Components don't depend on each other

2. **Component Ownership:**
   - Each component owns its related data and logic
   - No shared mutable state between components
   - Communication through coordinator only

3. **Extend Existing Patterns:**
   - `SnapMenuRenderer` already exists, extend it
   - `SnapMenuAutoHide` already exists, keep it
   - Follow same patterns for new components

4. **Gradual Refactoring:**
   - Create new components first
   - Refactor `SnapMenu` to use them
   - No big-bang rewrite

## Consequences

### Positive

- 70% reduction in `SnapMenu` class size (507 → ~150 lines)
- Clear boundaries between concerns
- Easier to add new features (e.g., different positioning strategies)
- Better testability (can test components independently)
- Improved code navigation (find-by-responsibility)
- Sets good pattern for future extensions

### Negative

- More files to navigate (1 → 6 files)
- Need to understand component interactions
- Slight performance overhead from delegation (negligible in practice)
- Initial refactoring effort required

### Neutral

- No changes to public API (backward compatible)
- No behavioral changes from user perspective
- Same dependencies (St, Main, etc.)

## Implementation Notes

### Component Interfaces

Each component should have a clear, minimal interface:

```typescript
// Example: SnapMenuState
class SnapMenuState {
  getCursor(): { x: number; y: number }
  updateCursor(x: number, y: number): void
  getMenuPosition(): { x: number; y: number }
  // ... minimal necessary methods
}
```

### Dependency Flow

```
User → SnapMenu → Components → Low-level utilities
```

Unidirectional flow prevents circular dependencies.

### Testing Strategy

- Unit test each component with mock dependencies
- Integration test `SnapMenu` with real components
- Manual E2E testing for UI behavior

## Validation

Success criteria to validate this decision:

- [ ] `SnapMenu` class < 200 lines
- [ ] Each component < 200 lines
- [ ] All existing functionality works
- [ ] Public API unchanged
- [ ] Build and tests pass
- [ ] Code review approved

## References

- Current `SnapMenu` implementation: `src/snap/snap-menu.ts`
- Existing renderer pattern: `src/snap/snap-menu-renderer.ts`
- Similar refactoring patterns in codebase: `src/snap/positioning/` (already modular)
