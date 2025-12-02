# Architecture Decision Record: Snap Menu Boundary Checking

## Status

Proposed

## Context

The snap menu currently positions itself directly at cursor coordinates without checking if the menu will overflow outside screen boundaries. This causes usability issues when the cursor is near screen edges. We need to implement boundary checking to ensure the menu is always fully visible.

Additionally, the current implementation positions the menu's top-left corner at the cursor position. This will be changed to center the menu horizontally on the cursor, providing a more intuitive and balanced appearance. The centered positioning must work in conjunction with boundary checking.

A similar boundary checking mechanism already exists for the debug panel (`calculateDebugPanelX()` in `src/snap/snap-menu.ts:273-313`), which provides a proven pattern to follow.

## Decision Drivers

- **User Experience**: Menu must be fully visible at all times
- **Performance**: Calculation runs on every cursor move during drag operations
- **Maintainability**: Should follow existing patterns and DRY principle
- **Visual Quality**: No flicker or jarring position changes
- **Consistency**: Align with existing debug panel implementation
- **Intuitive Positioning**: Menu should be centered on cursor for better spatial awareness

## Options Considered

### Option 1: Calculation-Based Boundary Adjustment (Recommended)

**Approach**: Calculate menu dimensions before rendering, then adjust position to fit within boundaries.

**Implementation**:
```typescript
// Calculate dimensions first
const dimensions = calculateMenuDimensions(categories);

// Adjust position before rendering
const adjusted = adjustPositionForBoundaries(x, y, dimensions.width, dimensions.height);

// Render at adjusted position
container.set_position(adjusted.x, adjusted.y);
```

**Pros**:
- ✅ No visual flicker (position set once before rendering)
- ✅ Better performance (no layout recalculation)
- ✅ Predictable behavior
- ✅ Follows GNOME Shell best practices for UI rendering
- ✅ Consistent with how debug panel works

**Cons**:
- ❌ Requires accurate dimension calculation logic
- ❌ Must keep dimension calculation in sync with actual UI layout
- ❌ More complex height calculation (must account for categories, rows, spacing)

**Complexity**: Medium (dimension calculation logic)

### Option 2: Render-Based Boundary Adjustment

**Approach**: Render menu first, get actual dimensions from rendered element, then adjust position.

**Implementation**:
```typescript
// Render first
Main.layoutManager.addChrome(container, {...});

// Get actual size after rendering
const [actualWidth, actualHeight] = container.get_size();

// Adjust position based on actual size
const adjusted = adjustPositionForBoundaries(x, y, actualWidth, actualHeight);
container.set_position(adjusted.x, adjusted.y);
```

**Pros**:
- ✅ Uses actual rendered dimensions (100% accurate)
- ✅ No need for complex height calculation
- ✅ Automatically stays in sync with UI changes

**Cons**:
- ❌ Potential visual flicker (menu renders, then moves)
- ❌ Performance overhead (layout calculation happens twice)
- ❌ GNOME Shell may not immediately provide accurate dimensions
- ❌ Goes against UI rendering best practices

**Complexity**: Low (simple to implement)

### Option 3: Hybrid Approach

**Approach**: Use estimated dimensions for initial positioning, then fine-tune after render.

**Pros**:
- ✅ Combines benefits of both approaches
- ✅ Reduces flicker with good estimation

**Cons**:
- ❌ Most complex implementation
- ❌ Still has potential for small visual adjustments
- ❌ Over-engineering for this use case

**Complexity**: High

## Decision

**Chosen Option: Option 1 (Calculation-Based Boundary Adjustment)**

### Rationale

1. **Performance Priority**: Drag operations require smooth, responsive UI updates. Calculation-based approach avoids layout recalculation overhead.

2. **Visual Quality**: GNOME Shell's rendering pipeline makes flicker-free UI updates critical for good UX. Setting position once before rendering prevents visual glitches.

3. **Proven Pattern**: Debug panel already uses calculation-based approach successfully. Following the same pattern ensures consistency.

4. **Acceptable Complexity**: While dimension calculation adds complexity, the logic is straightforward and can reuse existing patterns from `calculateDebugPanelX()`.

5. **Maintainability**: Keeping dimension calculation logic in sync with UI is manageable since menu layout is relatively stable.

## Implementation Details

### Dimension Calculation Strategy

**Width Calculation** (reuse existing logic from `calculateDebugPanelX()`):
```typescript
let maxCategoryWidth = 0;
for (const category of categoriesToRender) {
  const numDisplays = category.layoutGroups.length;
  const displaysInWidestRow = Math.min(numDisplays, MAX_DISPLAYS_PER_ROW);
  const categoryWidth =
    displaysInWidestRow * MINIATURE_DISPLAY_WIDTH +
    (displaysInWidestRow - 1) * DISPLAY_SPACING_HORIZONTAL;
  maxCategoryWidth = Math.max(maxCategoryWidth, categoryWidth);
}
const menuWidth = maxCategoryWidth + MENU_PADDING * 2;
```

**Height Calculation** (new implementation):
```typescript
const aspectRatio = global.screen_height / global.screen_width;
const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;

let totalHeight = MENU_PADDING * 2; // Top and bottom padding

for (let i = 0; i < categoriesToRender.length; i++) {
  const category = categoriesToRender[i];
  const numRows = Math.ceil(category.layoutGroups.length / MAX_DISPLAYS_PER_ROW);

  const categoryHeight =
    numRows * miniatureDisplayHeight +
    (numRows - 1) * DISPLAY_SPACING;

  totalHeight += categoryHeight;

  if (i < categoriesToRender.length - 1) {
    totalHeight += CATEGORY_SPACING;
  }
}

// Add footer height if shown
if (!debugConfig || debugConfig.showFooter) {
  totalHeight += FOOTER_MARGIN_TOP + 20; // Approximate footer height
}
```

### Menu Centering Decision

**Decision**: Position menu's top-center at cursor location (not top-left)

**Rationale**:
- More intuitive: Menu appears balanced around cursor
- Better spatial awareness: User sees menu expand equally left and right
- Improved UX: Cursor naturally points to middle of menu content

**Implementation**: Subtract half of menu width from X coordinate before boundary checking
```typescript
// Center menu horizontally on cursor
adjustedX = x - menuWidth / 2;
```

### Boundary Adjustment Algorithm

**Priority**: Center menu on cursor, then adjust to respect boundaries (including debug panel space)

```typescript
private adjustPositionForBoundaries(
  x: number,
  y: number,
  menuWidth: number,
  menuHeight: number,
  debugPanelEnabled: boolean
): { x: number; y: number } {
  const screenWidth = global.screen_width;
  const screenHeight = global.screen_height;
  const edgePadding = MENU_EDGE_PADDING; // 10px

  // Debug panel constants
  const debugPanelGap = 20;
  const debugPanelWidth = 300;

  // Step 1: Center menu horizontally on cursor
  let adjustedX = x - menuWidth / 2;
  let adjustedY = y;

  // Step 2: Apply boundary constraints
  // Calculate maximum X position (rightmost position where menu fits)
  let maxX: number;
  if (debugPanelEnabled) {
    // Reserve space for: menu width + gap + debug panel width + edge padding
    maxX = screenWidth - menuWidth - debugPanelGap - debugPanelWidth - edgePadding;
  } else {
    maxX = screenWidth - menuWidth - edgePadding;
  }

  // Right edge: shift left if menu would overflow
  if (adjustedX > maxX) {
    adjustedX = maxX;
  }

  // Left edge: clamp to minimum padding
  if (adjustedX < edgePadding) {
    adjustedX = edgePadding;
  }

  // Bottom edge: shift up if overflowing
  if (adjustedY + menuHeight > screenHeight - edgePadding) {
    adjustedY = screenHeight - menuHeight - edgePadding;
  }

  // Top edge: clamp to minimum padding
  if (adjustedY < edgePadding) {
    adjustedY = edgePadding;
  }

  return { x: adjustedX, y: adjustedY };
}
```

## Edge Padding Decision

### Options for Edge Padding Value

**Option A: Fixed 10px** (Chosen)
- Simple and consistent across all screen sizes
- Provides adequate visual breathing room
- Easier to reason about and debug

**Option B: Proportional (1% of screen width)**
```typescript
const edgePadding = Math.max(10, screenWidth * 0.01);
```
- Scales with screen resolution
- More complex calculation
- May be excessive on very large displays

**Decision**: Fixed 10px padding
- Simplicity outweighs marginal benefits of proportional scaling
- 10px adequate for all common display sizes (1920x1080 to 4K)
- Consistent with other UI spacing values in codebase

## Performance Optimization

### Dimension Calculation Frequency

**Challenge**: `updatePosition()` is called frequently during drag operations.

**Strategy**: Cache dimensions during `show()` call (chosen approach)

```typescript
private menuDimensions: { width: number; height: number } | null = null;

// In show(): calculate once and cache
this.menuDimensions = this.calculateMenuDimensions(categories);

// In updatePosition(): reuse cached value
if (this.menuDimensions) {
  const adjusted = this.adjustPositionForBoundaries(
    x, y,
    this.menuDimensions.width,
    this.menuDimensions.height,
    !!this.debugPanel
  );
  // Use cached dimensions, no recalculation
}
```

**Alternative (rejected)**: Recalculate on every `updatePosition()` call
- Would ensure 100% accuracy but degrades performance
- Menu dimensions don't change during drag, so recalculation is wasteful

**Cache invalidation**: Reset `menuDimensions` to `null` at start of `show()` method.

**Justification**: Menu dimensions don't change during drag operations, so caching eliminates redundant calculations while maintaining perfect accuracy.

## Consequences

### Positive

- Snap menu will always be fully visible within screen boundaries
- Menu centered on cursor provides better UX and spatial awareness
- No visual flicker or UI jumping
- Performance remains smooth during drag operations
- Code reuses existing patterns (debug panel)
- DRY principle maintained by sharing dimension calculation logic

### Negative

- Dimension calculation logic must be maintained alongside UI layout changes
- Small risk of calculation drift if UI changes without updating calculation
- Additional code complexity in `snap-menu.ts`

### Mitigation

- Document dimension calculation logic clearly
- Add comments linking calculation code to UI layout code
- Manual testing at various screen sizes to validate accuracy
- Consider adding automated tests in future

## Debug Panel Positioning Decision

**Decision**: Always position debug panel to the right of menu (not left)

**Previous Behavior**: Debug panel tried right side first, then fell back to left side if no space:
```typescript
// Old logic (lines 301-309)
let debugPanelX = menuX + menuWidth + debugPanelGap;
if (debugPanelX + debugPanelWidth > screenWidth) {
  debugPanelX = menuX - debugPanelWidth - debugPanelGap; // Fallback to left
}
```

**New Behavior**: Debug panel always on right, menu adjusts to make room:
```typescript
// New logic
const debugPanelX = adjustedMenuX + menuWidth + debugPanelGap;
this.debugPanel.show(debugPanelX, adjustedY, menuHeight);
```

**Rationale**:
- **Simplicity**: Eliminates complex left/right switching logic
- **Predictability**: Users always know where to find debug panel
- **Consistency**: Debug panel location doesn't jump around based on cursor position
- **Integration**: Boundary adjustment for menu considers debug panel space upfront

**Trade-off**: On narrow screens, menu may be pushed significantly left to make room for debug panel. This is acceptable because:
- Debug mode is for development, not production use
- Developers typically use wider screens
- Menu remains fully functional, just shifted left

**Implementation Impact**:
- `adjustPositionForBoundaries()` must know if debug panel is enabled
- Right boundary calculation includes debug panel width when enabled
- `calculateDebugPanelX()` method can be simplified or removed (always `menuX + menuWidth + gap`)

## Related Decisions

- Debug panel boundary checking: `src/snap/snap-menu.ts:273-313` (to be simplified)
- Menu layout structure: `src/snap/snap-menu-renderer.ts` (height calculation reference)
- Constants management: `src/snap/snap-menu-constants.ts` (where MENU_EDGE_PADDING goes)

## Empty Categories Handling

**Decision**: Display menu even when `categoriesToRender.length === 0`

**Rationale**:
- **Better UX**: User understands the menu is working, just no categories configured
- **Consistency**: Menu behavior is predictable (always shows on trigger)
- **Feedback**: "No categories available" message informs user of the state

**Implementation**:
- Check if categories array is empty in `show()` method
- Render alternative UI with centered message
- Use appropriate minimum dimensions for empty state
- Message suggestion: "No categories available" or "No layout categories configured"

**Alternative (rejected)**: Don't show menu when categories are empty
- Would confuse users (why doesn't menu appear?)
- No feedback that the feature is working

## Notes

- Multi-monitor support is not addressed in this decision (uses primary monitor dimensions)
- Future enhancement: Detect which monitor cursor is on and use that monitor's boundaries
- Menu larger than screen is edge case; current approach clamps to screen boundaries (acceptable)
- Footer height uses 20px approximation (adequate for single line of text)
- Coordinate storage happens only after adjustment (lines 95-96 in current code will be removed)
