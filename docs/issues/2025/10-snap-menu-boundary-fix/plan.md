# Snap Menu Boundary Overflow Prevention

## Overview

This issue addresses the problem where the snap menu overflows outside the screen boundaries when displayed near screen edges. The menu currently positions itself directly at the cursor location without boundary checking, causing parts of the menu to be hidden when the cursor is near the right, bottom, or corner edges of the screen.

Additionally, the menu currently positions its top-left corner at the cursor, which will be changed to center the menu horizontally on the cursor for better UX.

The fix will implement boundary checking similar to the existing debug panel implementation, ensuring the menu is always fully visible within screen boundaries while maintaining centered positioning.

## Problem Statement

### Current Behavior

- Snap menu is positioned directly at cursor coordinates using `container.set_position(x, y)` in `src/snap/snap-menu.ts:175`
- Menu's top-left corner is placed at cursor position without any boundary validation
- No boundary checking in `updatePosition()` method (line 260) during drag operations
- Debug panel already has boundary checking (lines 273-313), but main menu does not

### Positioning Issue

Current implementation positions the menu's **top-left corner** at the cursor position. This should be changed to position the **top-center** of the menu at the cursor position for better UX:

**Current:**
```
cursor (x, y)
    ↓
    ┌─────────────┐
    │   Menu      │
    └─────────────┘
```

**Desired:**
```
       cursor (x, y)
           ↓
    ┌─────────────┐
    │   Menu      │
    └─────────────┘
```

This change requires adjusting the X coordinate: `menuX = cursorX - (menuWidth / 2)` before applying boundary checks.

### Issues

- When cursor is near screen edges (right, bottom, or corners), menu overflows outside visible area
- Users cannot see or interact with overflow portions of the menu
- Inconsistent behavior: debug panel stays within bounds, but main menu does not

### Impact

- **User Experience**: Menu becomes partially unusable near screen edges
- **Severity**: Medium (functionality works but creates poor UX)
- **Frequency**: Common when dragging windows to edges (primary use case for snap feature)

## Requirements

### Functional Requirements

- Snap menu must be fully visible within screen boundaries at all times
- Menu must be centered horizontally on cursor position (top-center alignment, not top-left)
- Menu position should stay as close to cursor as possible while respecting boundaries
- Boundary checking must work for both initial display (`show()`) and dynamic updates (`updatePosition()`)
- Debug panel must always be positioned to the right of menu (not left)
- When debug panel is enabled, menu position must account for debug panel space to ensure both fit on screen
- Menu must display even when no categories are available, showing "No categories" message
- Minimum padding of 10px from screen edges

### Non-Functional Requirements

- Performance: Boundary calculation must be fast (runs on every cursor move during drag)
- Consistency: Follow existing debug panel boundary checking patterns
- Maintainability: Use DRY principle to share dimension calculation logic

## Implementation Plan

### Phase 1: Core Functionality (2 points)

- Add `MENU_EDGE_PADDING` constant to `src/snap/snap-menu-constants.ts`
  - Value: `10` (pixels from screen edge)
  - Purpose: Minimum distance from screen boundaries

- Implement `calculateMenuDimensions()` private method in `src/snap/snap-menu.ts`
  - Calculate width: Reuse logic from `calculateDebugPanelX()`
  - Calculate width formula: `maxCategoryWidth + MENU_PADDING * 2`
  - Calculate height: Sum of all category heights with spacing
  - Height calculation:
    - Rows per category: `Math.ceil(layoutGroups.length / MAX_DISPLAYS_PER_ROW)`
    - Display height: `MINIATURE_DISPLAY_WIDTH * aspectRatio`
    - Total: padding + category heights + spacing + footer
  - Return: `{ width: number, height: number }`

- Implement `adjustPositionForBoundaries()` private method
  - Parameters: `x, y, menuWidth, menuHeight, debugPanelEnabled: boolean`
  - Logic:
    - **First: Center alignment** - Adjust X coordinate to center menu: `x = x - menuWidth / 2`
    - Calculate maximum X position (where menu's left edge can be while fitting on screen):
      - If debug panel enabled: `maxX = screenWidth - menuWidth - debugPanelGap - debugPanelWidth - padding`
      - Otherwise: `maxX = screenWidth - menuWidth - padding`
    - Check right edge: If `adjustedX > maxX`, clamp to `maxX`
    - Check left edge: If `adjustedX < padding`, clamp to padding
    - Check bottom edge: If `y + height > screenHeight - padding`, shift up
    - Check top edge: If adjusted y < padding, clamp to padding
  - Return: `{ x: number, y: number }`
  - Note: Debug panel constants (gap=20px, width=300px) should be imported or defined

### Phase 2: Integration (2 points)

- Update `show()` method (around line 126)
  - Calculate menu dimensions after determining categories to render
  - Remove existing coordinate storage at lines 95-96 (will store adjusted coordinates instead)
  - Adjust position using `adjustPositionForBoundaries(x, y, width, height, !!this.debugPanel)`
  - Store adjusted coordinates in `this.menuX` and `this.menuY` (after adjustment, not before)
  - Use adjusted coordinates in `container.set_position()` (line 175)
  - Cache dimensions in `this.menuDimensions` for updatePosition reuse
  - Update debug panel positioning (line 195-197):
    - Always position debug panel to the right: `debugPanelX = adjustedX + menuWidth + debugPanelGap`
    - Use adjusted Y coordinate: `this.debugPanel.show(debugPanelX, adjustedY, menuHeight)`
    - Remove left-side fallback logic (debug panel always on right)
  - Replace hardcoded `menuHeight = 500` with calculated value

- Update `updatePosition()` method (lines 258-268)
  - Use cached `this.menuDimensions` from show() call (do not recalculate for performance)
  - Adjust position using `adjustPositionForBoundaries(x, y, this.menuDimensions.width, this.menuDimensions.height, !!this.debugPanel)`
  - Update stored `this.menuX` and `this.menuY` with adjusted values
  - Update container position: `this.container.set_position(adjustedX, adjustedY)`
  - Update debug panel position if enabled:
    - Calculate X: `debugPanelX = adjustedX + this.menuDimensions.width + debugPanelGap`
    - Update Y with adjusted coordinate: `this.debugPanel.updatePosition(debugPanelX, adjustedY)`

### Phase 3: Optimization and Enhancement (1.5 points)

- Refactor or remove `calculateDebugPanelX()` method (lines 273-313)
  - Debug panel is now always positioned to the right of menu
  - Calculation is simple: `menuX + menuWidth + debugPanelGap`
  - Consider removing this method and calculating inline
  - Remove left-side fallback logic (lines 303-309)

- Add "No categories" fallback display
  - When `categoriesToRender.length === 0`, show empty state message
  - Display centered text: "No categories available" or similar
  - Ensure menu still renders with appropriate minimum size
  - This improves UX when no layout categories are configured

- Testing and edge case validation
  - Test at each screen edge (top, bottom, left, right)
  - Test at each corner (top-left, top-right, bottom-left, bottom-right)
  - Test with debug panel enabled at right and left edges
  - Test with multiple categories to increase menu height
  - Verify drag operations maintain boundary constraints

## Technical Approach

See `adr.md` for detailed analysis of technical decisions including:
- Calculation-based vs render-based boundary adjustment
- Fixed vs proportional edge padding
- Performance optimization strategies

The chosen approach uses calculation-based boundary adjustment with fixed 10px edge padding, prioritizing performance and avoiding visual flicker.

## Files to Modify

- `src/snap/snap-menu-constants.ts` - Add MENU_EDGE_PADDING constant
- `src/snap/snap-menu.ts` - Main implementation (methods and updates)

## Edge Cases

- **Center alignment near edges**: When cursor is near left/right edge, menu should shift to stay in bounds but attempt to remain centered when possible
- **Narrow screens**: On very narrow screens, menu width might exceed screen width - clamp to screen bounds with minimal padding
- **Screen corners**: Both X and Y adjustments must work simultaneously with center alignment
- **Menu larger than screen**: Position at top-left with minimal padding (extreme edge case)
- **Debug panel space reservation**: When debug panel enabled, menu must leave room on right side (menuWidth + gap + debugPanelWidth)
- **Debug panel always on right**: No left-side fallback, may push menu significantly left when screen is narrow
- **Empty categories**: Menu renders with "No categories" message when `categoriesToRender.length === 0`
- **Multi-monitor**: Current implementation uses primary monitor dimensions (future enhancement)

## Testing Strategy

### Manual Testing Scenarios

- **Center alignment test**: Position cursor in middle of screen, verify menu is centered horizontally on cursor
- Position cursor at top edge, verify menu doesn't overflow top
- Position cursor at bottom edge, verify menu doesn't overflow bottom
- Position cursor at left edge, verify menu doesn't overflow left (menu shifts right)
- Position cursor at right edge, verify menu doesn't overflow right (menu shifts left)
- Position cursor at each corner, verify full menu visibility and centering behavior
- Enable debug mode, position cursor near right edge, verify both menu and debug panel fit on screen
- Enable debug mode, position cursor at screen center, verify debug panel is on right side of menu
- Test with no categories configured, verify "No categories" message displays
- Drag window slowly across edges, verify smooth position updates and centering
- Add test layouts to increase menu size, verify boundary handling with centered positioning

### Validation Criteria

- Menu is fully visible in all test scenarios
- Menu is horizontally centered on cursor when space permits
- When near edges, menu shifts to stay within bounds while maintaining visibility
- No visual flicker or jumping during position adjustments
- Debug panel maintains correct relative positioning
- Performance remains smooth during drag operations

## Success Criteria

- Snap menu is always fully visible within screen boundaries
- Menu is centered horizontally on cursor position (top-center alignment)
- Menu position stays close to cursor while respecting boundaries
- Debug panel continues to position correctly relative to menu
- No performance degradation during drag operations
- Code follows DRY principle with shared dimension calculations

## Timeline Estimate

- Phase 1 (Core Functionality): 2 points
- Phase 2 (Integration): 2 points
- Phase 3 (Optimization and Enhancement): 1.5 points
- **Total**: 5.5 points

## References

- Existing debug panel boundary logic: `src/snap/snap-menu.ts:273-313`
- Menu positioning: `src/snap/snap-menu.ts:90-199` (show method)
- Position updates: `src/snap/snap-menu.ts:258-268` (updatePosition method)
- Constants: `src/snap/snap-menu-constants.ts`
