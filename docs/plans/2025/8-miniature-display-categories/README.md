# Miniature Display Categories

## Overview

Introduce a new hierarchical layer called "Miniature Display Categories" to organize multiple miniature displays horizontally within vertical groups. This allows for more flexible layout organization where related display patterns can be grouped together.

## Current Structure (Issue #7 Implementation)

```
SnapMenu
└── Displays Container (St.BoxLayout - vertical)
    ├── Miniature Display 1 (Three-Way Split)
    ├── Miniature Display 2 (Center Half)
    └── Miniature Display 3 (Two-Way Split)
```

**Current Behavior:**
- Miniature displays are arranged **vertically** in a single column
- Each miniature display corresponds to one `SnapLayoutGroup`
- Each miniature display contains multiple layout buttons
- No grouping mechanism for related displays

## New Structure (Target)

```
SnapMenu
└── Display Categories Container (St.BoxLayout - vertical)
    ├── Miniature Display Category 1 (St.BoxLayout - horizontal)
    │   ├── Miniature Display 1-1
    │   ├── Miniature Display 1-2
    │   └── ... (multiple displays per category)
    ├── Miniature Display Category 2 (St.BoxLayout - horizontal)
    │   └── ... (multiple displays per category)
    └── Miniature Display Category 3 (St.BoxLayout - horizontal)
        └── ... (multiple displays per category)
```

**New Behavior:**
- Categories are arranged **vertically**
- Within each category, miniature displays are arranged **horizontally**
- Adds one additional hierarchy level (Category layer)
- See "Example Configuration" section below for concrete layout examples

## Key Concepts

### Terminology Change
- **Old**: `SnapLayoutGroup` → represents one miniature display
- **New**: `SnapLayoutGroup` → remains the same, represents one miniature display
- **New**: `MiniatureDisplayCategory` → groups multiple miniature displays horizontally

### Display vs Category
- **Miniature Display**: Contains multiple layout buttons representing one layout pattern
  - One display = one SnapLayoutGroup = multiple layout buttons
  - Each button represents a window placement option
- **Miniature Display Category**: Groups related display patterns horizontally
  - One category = multiple displays arranged horizontally
  - Used to organize displays by theme or complexity

See "Example Configuration" section for concrete examples.

### Why Not Split Displays?
A single layout button (e.g., "left half") can be contained in one display alongside other related buttons (e.g., "right half"). There's no need to create separate displays for each button.

The purpose of categories is to **group different layout patterns**, not to separate individual buttons.

## Example Configuration

**Note**: This section defines the concrete layout structure. All other sections reference this as the single source of truth for category and display definitions.

### Category 1: Vertical Division Patterns
- **Display 1-1**: Vertical 3-split
  - Button: Left third
  - Button: Center third
  - Button: Right third
- **Display 1-2**: Vertical 3-split × Horizontal 2-split (6 buttons in grid)
  - Button: Top-left
  - Button: Top-center
  - Button: Top-right
  - Button: Bottom-left
  - Button: Bottom-center
  - Button: Bottom-right

### Category 2: Grid Patterns (Progressive Complexity)
- **Display 2-1**: Vertical 2-split × Horizontal 1 (2 buttons)
  - Button: Left half
  - Button: Right half
- **Display 2-2**: Vertical 2-split × Horizontal 2-split (2×2 grid, 4 buttons)
  - Button: Top-left quadrant
  - Button: Top-right quadrant
  - Button: Bottom-left quadrant
  - Button: Bottom-right quadrant
- **Display 2-3**: Vertical 4-split × Horizontal 2-split (4×2 grid, 8 buttons)
  - Button: Top-left
  - Button: Top-center-left
  - Button: Top-center-right
  - Button: Top-right
  - Button: Bottom-left
  - Button: Bottom-center-left
  - Button: Bottom-center-right
  - Button: Bottom-right

### Category 3: Center-Focused Patterns
- **Display 3-1**: Center 50% with side columns split vertically (5 buttons)
  - Button: Left-top (25% width × 50% height)
  - Button: Left-bottom (25% width × 50% height)
  - Button: Center (50% width × 100% height)
  - Button: Right-top (25% width × 50% height)
  - Button: Right-bottom (25% width × 50% height)

## Scope

This issue focuses **only** on introducing the category hierarchy for organizing miniature displays. The following is **out of scope**:

- Layer/package separation (data structures vs UI widgets)
- File structure reorganization
- Naming convention changes

**Note**: Layer separation and architectural improvements are tracked in **Issue #9** (Layer Separation Refactoring), which should be implemented after this issue is complete.

## Type System Changes

### New Interface: MiniatureDisplayCategory

```typescript
interface MiniatureDisplayCategory {
    name: string;                      // Category name (e.g., "Vertical Divisions")
    layoutGroups: SnapLayoutGroup[];   // Array of layout groups (displays) in this category
}
```

**Note**: This interface will be added to `snap-menu-types.ts` alongside existing interfaces. Future reorganization into a layered structure is tracked in Issue #9.

### Existing Interface: SnapLayoutGroup (Unchanged)

```typescript
interface SnapLayoutGroup {
    name: string;              // Display name (e.g., "Vertical 3-split")
    layouts: SnapLayout[];     // Array of layout buttons in this display
}
```

### Existing Interface: SnapLayout (Unchanged)

```typescript
interface SnapLayout {
    label: string;        // Button label (e.g., "Left Third")
    x: string;           // Position expression
    y: string;           // Position expression
    width: string;       // Size expression
    height: string;      // Size expression
    zIndex: number;      // Stacking order
}
```

## Implementation Plan

### Phase 1: Type Definitions
- Create `MiniatureDisplayCategory` interface in `snap-menu-types.ts`
- Add type definitions for category-based rendering
- Update test layouts to use category structure

### Phase 2: Rendering Functions
- Create `createCategoriesContainer()` function
  - Returns St.BoxLayout with vertical layout
  - Creates one category container for each category
- Create `createCategoryContainer()` function
  - Takes a `MiniatureDisplayCategory` as parameter
  - Returns St.BoxLayout with horizontal layout
  - Creates miniature displays for all layout groups in the category
- Update `createMiniatureDisplay()` function if needed
  - Should work without changes (already accepts SnapLayoutGroup)

### Phase 3: Update SnapMenu Main Container
- Change rendering logic to iterate through categories
- For each category:
  - Create category container (horizontal)
  - For each layout group in category:
    - Create miniature display
    - Add to category container
  - Add category container to main categories container (vertical)

### Phase 4: Update Layout Data Structure
- Convert existing `TEST_LAYOUT_GROUPS` to category-based structure
- Convert production layout groups to category-based structure
- Organize layouts into logical categories

### Phase 5: Spacing and Styling
- Define spacing between categories (vertical)
- Define spacing between displays within a category (horizontal)
- Update constants in `snap-menu-constants.ts` if needed
- Ensure consistent styling across all hierarchy levels

### Phase 6: Update Debug Panel
- Update debug panel to reflect the new category structure
- Display category information (category name, number of displays in category)
- Update structure visualization to show the category hierarchy
- Ensure debug panel correctly shows:
  - Category Container (vertical layout)
  - Individual categories (horizontal layout within each category)
  - Miniature displays within each category
  - Layout buttons within each display

### Phase 7: Testing and Validation
- Verify visual layout matches expected structure
- Test with various numbers of categories and displays
- Verify hover and click interactions work correctly
- Test with different screen aspect ratios
- Run build and checks: `npm run build && npm run check && npm run test:run`

## Technical Considerations

### Layout Hierarchy
```
Container (vertical)
  ├── Categories Container (vertical)
  │   ├── Category Container 1 (horizontal)
  │   │     ├── Display 1-1 (FixedLayout internally)
  │   │     ├── Display 1-2 (FixedLayout internally)
  │   │     └── ... (variable number of displays)
  │   ├── Category Container 2 (horizontal)
  │   │     ├── Display 2-1 (FixedLayout internally)
  │   │     ├── Display 2-2 (FixedLayout internally)
  │   │     ├── Display 2-3 (FixedLayout internally)
  │   │     └── ... (variable number of displays)
  │   └── Category Container N (horizontal)
  │         └── ... (variable number of displays)
  └── Footer
```

**Note**: See "Example Configuration" section for concrete category and display definitions.

### Coordinate Transformation
With the additional category layer, coordinate transformation becomes:
- Screen coordinates → Container → Categories container → Category container → Miniature display → Layout button

The existing `get_transformed_position()` should handle this automatically.

### Spacing Constants
Need to define:
- `CATEGORY_SPACING`: Vertical spacing between categories (e.g., 16px)
- `DISPLAY_SPACING_HORIZONTAL`: Horizontal spacing between displays within a category (e.g., 12px)
- Keep existing `DISPLAY_SPACING` for consistency (may rename to `DISPLAY_SPACING_VERTICAL`)

### Backward Compatibility
The change is structural but should maintain:
- Same interfaces for `SnapLayout` and `SnapLayoutGroup`
- Same hover/click behavior
- Same auto-hide functionality
- All expression evaluation logic unchanged

### Debug Panel Impact
The debug panel (Issue #6) will need updates to reflect the new structure:
- **Current**: Shows display groups stacked vertically
- **New**: Must show categories (vertical) containing displays (horizontal)
- Debug panel should display:
  - Total number of categories
  - For each category: name and number of displays
  - For each display: name and number of layout buttons
  - Visual hierarchy showing the category → display → button relationship

## Success Criteria

- [ ] `MiniatureDisplayCategory` interface defined
- [ ] Category-based rendering functions implemented
- [ ] Categories arranged vertically in main container
- [ ] Displays arranged horizontally within each category
- [ ] All existing functionality preserved (hover, click, auto-hide)
- [ ] Visual spacing between categories and displays looks good
- [ ] Test layouts organized into logical categories
- [ ] Production layouts organized into logical categories
- [ ] Debug panel updated to show category structure
- [ ] Debug panel displays category names and counts
- [ ] Debug panel shows the category → display → button hierarchy
- [ ] All type checks pass
- [ ] All tests pass
- [ ] Code passes `npm run build && npm run check && npm run test:run`

## Future Considerations

### Layer Separation (Issue #9)
After this issue is complete, the codebase should be refactored to clearly separate:
- Data structures (types layer)
- UI widget creation (UI layer)
- Orchestration logic (renderer layer)

See **Issue #9** (Layer Separation Refactoring) for detailed plans.

### Dynamic Category Management
- Categories could be loaded from configuration
- Categories could be filtered based on user preferences
- Categories could be collapsed/expanded (future UI enhancement)

### Category Metadata
Future extensions might include:
- Category descriptions
- Category icons
- Category priority/ordering
- Category visibility toggles

## Timeline Estimate

**4 points** - Medium complexity refactoring with additional hierarchy layer
