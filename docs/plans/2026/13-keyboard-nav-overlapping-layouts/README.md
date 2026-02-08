# Keyboard Navigation for Overlapping Layouts

Status: Completed

## Overview

Arrow key navigation cannot reach overlapping layout buttons (e.g., a chat overlay on top of a game region). The edge-based algorithm requires a target's opposite edge to be beyond the current button's edge, which excludes overlays inside their parent. Rather than modifying the arrow key algorithm (which proved brittle across many overlap patterns), this is solved by adding **Tab/Shift+Tab navigation** that cycles through all buttons in a deterministic order.

## Problem

The directional constraint in `keyboard-navigator.ts` requires the target button's opposite edge to be beyond the current button's edge in the pressed direction. For an overlay that sits inside its parent, no direction satisfies this condition:

```
Base (A):    x=0, width=100%
Overlay (B): x=75%, width=25%

Right: B.left(75%) >= A.right(100%) → false
Left:  B.right(100%) <= A.left(0%) → false
```

The overlay is unreachable via arrow keys.

### Why arrow-key-based solutions don't work

Several approaches were attempted to make overlapping buttons reachable via arrow keys:

1. **Center-based waypoint insertion**: Prioritize overlapping buttons whose center is further in the pressed direction. Fails for concentric layouts (e.g., triple stack) where all centers are identical.

2. **Area-based inward/outward navigation**: Only navigate to smaller overlapping buttons (inward), using area as a tiebreaker. Creates dead ends — once on a small overlay, edge-based navigation to siblings always preempts the path back to the parent.

3. **Escape hatch fallback**: When no directional candidate exists, fall back to any larger overlapping button. Causes erratic jumps (e.g., skipping rows) because the fallback ignores direction entirely.

The fundamental issue: for overlapping layouts, "which button is next in this direction" is visually ambiguous and no single heuristic handles all patterns (corner overlays, concentric stacks, multiple PiP windows, cross overlaps, partial overlaps).

## Solution: Tab/Shift+Tab navigation

Arrow keys continue to use the existing edge-based spatial algorithm (unchanged). Tab/Shift+Tab provides a **sequential, deterministic** traversal of all buttons, including overlapping ones.

This is a clean separation of concerns:
- **Arrow keys**: spatial navigation for non-overlapping layouts (works reliably)
- **Tab/Shift+Tab**: sequential navigation that guarantees all buttons are reachable

Users with overlay layouts use Tab to reach overlapping buttons. Users without overlays are unaffected.

## Implementation

### 1. Add `_rowIndex` metadata to buttons

**File: `src/app/types/button.ts`**

Add `_rowIndex` to `LayoutButtonWithMetadata` to track which row each button belongs to.

**File: `src/app/main-panel/renderer.ts`**

Set `_rowIndex = i` on each button during `createSpacesRowView()`.

### 2. Add Tab/Shift+Tab handling

**File: `src/app/main-panel/keyboard-navigator.ts`**

Handle `KEY_Tab` and `KEY_ISO_Left_Tab` (Shift+Tab) in `handleKeyPress()`.

### 3. Build deterministic tab order

**File: `src/app/main-panel/keyboard-navigator.ts`**

`buildTabOrder()` sorts all reactive buttons by:
1. Row index (top to bottom)
2. X position (left to right within a row)
3. Y position (top to bottom within same X)
4. Area descending (parent before overlay at same position)

`tabFocus(reverse)` moves to the next/previous button in this order, wrapping around at boundaries.

## Verification

- `npm run build && npm run check && npm run test:run`
- Manual test with `overlap-patterns.json`: Tab should cycle through all buttons including overlapping ones
- Manual test with non-overlapping layouts: arrow keys should work as before
