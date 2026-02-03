# Snap Menu Display Structure Refactoring

## Overview

Refactor the SnapMenu rendering structure to create a more hierarchical and maintainable layout system. The new structure will separate display representation from layout groups, enabling better organization and future multi-display support.

## Current Situation

The current `SnapMenu` implementation (src/snap/snap-menu.ts) uses a flat structure with `FixedLayout`:

```
container (St.Widget)
├── groupContainer × 3 (manually positioned)
│   └── layout buttons (St.Button)
└── footer (St.Label)
```

**Current Issues:**
- All elements use absolute positioning with manual Y-coordinate calculation
- Layout groups are directly placed in the container
- No visual separation between the concept of "display" and "layout groups"
- Difficult to extend for multi-display scenarios

## Goals

Transform the structure to:

```
container (St.BoxLayout - vertical)
├── displays (St.BoxLayout - vertical)
│   ├── miniatureDisplay (St.Widget) - for layout group 1
│   │   ├── background with light black color
│   │   └── layout buttons (St.Button) - from group 1
│   ├── miniatureDisplay (St.Widget) - for layout group 2
│   │   ├── background with light black color
│   │   └── layout buttons (St.Button) - from group 2
│   └── miniatureDisplay (St.Widget) - for layout group 3
│       ├── background with light black color
│       └── layout buttons (St.Button) - from group 3
└── footer (St.Label)
```

**Key Requirements:**
- Container has vertical layout: displays on top, footer on bottom
- Displays container stacks miniature displays vertically
- **Each layout group is rendered as a separate miniature display**
- Each miniature display has light black background color
- Each miniature display aspect ratio matches the user's actual display aspect ratio
- Miniature displays can be added dynamically (supports future multi-display scenarios)
- Maintain existing interfaces: `SnapLayout`, `SnapLayoutGroup`
- Preserve all existing functionality: hover effects, click events, auto-hide behavior

## Implementation Plan

### Phase 1: Analysis
- Analyze current `SnapLayout` and `SnapLayoutGroup` interfaces to confirm no changes needed
- Analyze existing hover, click, and auto-hide implementations to understand dependencies
- Document current size calculation logic for reference

### Phase 2: Create New Structure Components
- Create `_createDisplaysContainer()` method
  - Returns St.BoxLayout with vertical layout
  - Creates one miniature display for each layout group
- Create `_createMiniatureDisplay()` method
  - Takes a layout group as parameter
  - Returns St.Widget with light black background
  - Calculates size based on screen aspect ratio
  - Uses FixedLayout for internal positioning of buttons
  - Adds layout buttons only from the specified group
- Remove `_createGroupContainer()` method
  - Replace with miniature display rendering
- Update `_createLayoutButtonForGroup()` method
  - Rename to `_createLayoutButton()` (simplified naming)
  - Calculate button position relative to miniature display size
  - Maintain existing hover and click logic

### Phase 3: Refactor Main Container
- Change container from St.Widget (FixedLayout) to St.BoxLayout (vertical)
- Replace manual positioning logic with BoxLayout-based structure
- Update size calculations to account for new hierarchy
  - Each miniature display size based on screen aspect ratio
  - Container size determined by BoxLayout (displays + footer)
- Position displays container and footer using BoxLayout
- Iterate through all layout groups and create miniature displays
  - Each group gets its own miniature display with its own buttons

### Phase 4: Update Position and Layout Detection
- Update `updatePosition()` if needed for new structure
- Verify `getLayoutAtPosition()` works correctly with new structure
  - Uses `get_transformed_position()` which handles coordinate transformation automatically
- Test coordinate transformation with existing layout detection logic

### Phase 5: Testing and Validation
- Verify all existing functionality works:
  - Menu shows at correct position
  - Layout buttons respond to hover
  - Click events trigger layout selection
  - Auto-hide works when cursor leaves
  - Background click closes menu
- Verify visual appearance:
  - Each miniature display has correct aspect ratio
  - Background color is visible on each miniature display
  - Layout buttons are properly positioned within each miniature display
  - Miniature displays are stacked vertically with appropriate spacing
  - Footer appears below all displays

### Phase 6: Code Quality
- Run `npm run build && npm run check`
- Fix any type errors or linting issues
- Ensure code follows existing patterns

## Technical Considerations

### Coordinate Transformation
With the new structure, coordinates need transformation:
- Screen coordinates (from cursor) → Container coordinates → Displays coordinates → Miniature display coordinates → Layout button coordinates
- `getLayoutAtPosition()` must account for all these offsets
- **Action Required**: Check usage of `getLayoutAtPosition()` in codebase before refactoring to understand all callers

### Size Calculations
Current approach:
```typescript
const groupWidth = 300;
const groupHeight = groupWidth * aspectRatio;
```

New approach:
```typescript
const miniatureDisplayWidth = 300; // Fixed value (confirmed)
const miniatureDisplayHeight = miniatureDisplayWidth * aspectRatio;

// Layout groups no longer have containers
// All buttons are sized relative to miniature display dimensions
```

### Background Color
**Confirmed value**: Use `rgba(30, 30, 30, 0.8)` for miniature display background

### Layout Group to Miniature Display Relationship
**Important**: Each layout group has a 1:1 relationship with its own miniature display:
- Each layout group is rendered as a separate miniature display widget
- Each miniature display contains only the layout buttons from its corresponding group
- Miniature displays are stacked vertically with spacing between them
- This design allows for flexible expansion: additional miniature displays can be added for multi-display scenarios

### Layout Manager Changes
- Container: Change from `FixedLayout` to `BoxLayout` with vertical orientation
- Displays: New `BoxLayout` with vertical orientation (stacks miniature displays)
- Miniature display: Keep `FixedLayout` for internal button positioning
- Each layout group is rendered as a separate miniature display widget

## Future Considerations

### Multi-Display Support
The new structure enables future multi-display support:
- The displays container can hold any number of miniature displays
- Currently: Each layout group = one miniature display (vertical stacking)
- Future: Can add miniature displays representing different physical displays
- The flexible miniature display system allows both scenarios:
  - Multiple layout groups as separate miniature displays (current)
  - Multiple physical displays as separate miniature displays (future)

This refactoring creates a flexible foundation for various display scenarios.

## Success Criteria

- [x] New hierarchical structure implemented (container → displays → miniature displays → buttons)
- [x] Each layout group rendered as separate miniature display
- [x] Each miniature display has light black background color
- [x] Each miniature display aspect ratio matches screen aspect ratio
- [x] Miniature displays stacked vertically with appropriate spacing
- [x] All existing hover effects work correctly
- [x] All click events trigger properly
- [x] Auto-hide behavior functions as before
- [x] `SnapLayout` and `SnapLayoutGroup` interfaces unchanged
- [x] No type errors or linting issues
- [x] Code passes `npm run build && npm run check`

## Timeline Estimate

**6 points** - Medium complexity refactoring with careful coordinate transformation work
