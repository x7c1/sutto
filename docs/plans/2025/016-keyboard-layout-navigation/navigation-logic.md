# Keyboard Navigation Logic - Midpoint-Based Algorithm

## Overview

This document explains the keyboard navigation logic for the layout selection panel. The algorithm uses **edge midpoint distances** to determine the next layout to focus on when a directional key is pressed. This approach provides intuitive navigation that respects the visual relationships between layouts, regardless of their arrangement or absolute positioning.

## Core Concept

When navigating from layout X to another layout, the algorithm:

1. Identifies the **relevant edge midpoint** of the current layout X based on the direction
2. Finds all candidate layouts in that direction
3. Calculates distances from X's edge midpoint to each candidate's **opposite edge midpoint**
4. Selects the layout with the **shortest distance**

## Edge Midpoint Definitions

For a layout button with position `(x, y)` and size `(width, height)`:

- **Left edge midpoint**: `(x, y + height/2)`
- **Right edge midpoint**: `(x + width, y + height/2)`
- **Top edge midpoint**: `(x + width/2, y)`
- **Bottom edge midpoint**: `(x + width/2, y + height)`

## Navigation Procedures

### Right Key (→)

**Goal**: Move focus to the layout that is immediately to the right

**Procedure**:
1. Calculate the **right edge midpoint** `m` of current layout X
   - `m = (X.x + X.width, X.y + X.height/2)`
2. For each layout in the panel:
   - Calculate its **left edge midpoint** `n = (layout.x, layout.y + layout.height/2)`
   - Check condition: `n.x > m.x` (layout is to the right of X)
   - If condition is met, calculate distance: `distance = sqrt((n.x - m.x)² + (n.y - m.y)²)`
3. Select the layout with the **minimum distance**

**Example**:
```
Current layout X at (50, 100), size (80, 60)
  → Right edge midpoint m = (130, 130)

Candidate layouts:
  A at (200, 90), size (80, 60)  → Left edge midpoint = (200, 120)
    Distance = sqrt((200-130)² + (120-130)²) = sqrt(4900 + 100) = 70.71

  B at (180, 150), size (80, 60) → Left edge midpoint = (180, 180)
    Distance = sqrt((180-130)² + (180-130)²) = sqrt(2500 + 2500) = 70.71

Result: A or B (both equidistant, typically choose first found)
```

### Down Key (↓)

**Goal**: Move focus to the layout that is immediately below

**Procedure**:
1. Calculate the **bottom edge midpoint** `m` of current layout X
   - `m = (X.x + X.width/2, X.y + X.height)`
2. For each layout in the panel:
   - Calculate its **top edge midpoint** `n = (layout.x + layout.width/2, layout.y)`
   - Check condition: `n.y > m.y` (layout is below X)
   - If condition is met, calculate distance: `distance = sqrt((n.x - m.x)² + (n.y - m.y)²)`
3. Select the layout with the **minimum distance**

### Left Key (←)

**Goal**: Move focus to the layout that is immediately to the left

**Procedure**:
1. Calculate the **left edge midpoint** `m` of current layout X
   - `m = (X.x, X.y + X.height/2)`
2. For each layout in the panel:
   - Calculate its **right edge midpoint** `n = (layout.x + layout.width, layout.y + layout.height/2)`
   - Check condition: `n.x < m.x` (layout is to the left of X)
   - If condition is met, calculate distance: `distance = sqrt((n.x - m.x)² + (n.y - m.y)²)`
3. Select the layout with the **minimum distance**

### Up Key (↑)

**Goal**: Move focus to the layout that is immediately above

**Procedure**:
1. Calculate the **top edge midpoint** `m` of current layout X
   - `m = (X.x + X.width/2, X.y)`
2. For each layout in the panel:
   - Calculate its **bottom edge midpoint** `n = (layout.x + layout.width/2, layout.y + layout.height)`
   - Check condition: `n.y < m.y` (layout is above X)
   - If condition is met, calculate distance: `distance = sqrt((n.x - m.x)² + (n.y - m.y)²)`
3. Select the layout with the **minimum distance**

## Boundary Conditions

### No Candidate Found

If no layout satisfies the directional condition (e.g., pressing right when already at the rightmost layout):

- **Option A**: Do nothing, keep focus on current layout
- **Option B**: Wrap around to the opposite side

**Recommendation**: Start with Option A (no wrap-around) for predictable behavior.

### Multiple Layouts at Same Distance

If multiple layouts have identical minimum distances:
- Select the first one found in the iteration order
- Alternative: Use a secondary criterion (e.g., prefer vertically closer for horizontal movement)

## Algorithm Advantages

1. **Intuitive**: Matches human spatial reasoning about "nearest neighbor" in a direction
2. **Flexible**: Works with irregular layouts, different sizes, and arbitrary positioning
3. **No Grid Required**: Does not depend on row/column structure or DOM order
4. **Predictable**: Always selects the visually closest layout in the intended direction

## Implementation Notes

### Required Information per Layout

For each layout button, store:
- Position: `(x, y)` - top-left corner coordinates
- Size: `(width, height)` - button dimensions
- Reference to button object and layout data

### Distance Calculation

Use Euclidean distance:
```typescript
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
```

### Edge Midpoint Calculation

```typescript
interface EdgeMidpoints {
  left: Point;
  right: Point;
  top: Point;
  bottom: Point;
}

function calculateEdgeMidpoints(x: number, y: number, width: number, height: number): EdgeMidpoints {
  return {
    left: { x: x, y: y + height / 2 },
    right: { x: x + width, y: y + height / 2 },
    top: { x: x + width / 2, y: y },
    bottom: { x: x + width / 2, y: y + height }
  };
}
```

## Summary

The midpoint-based navigation algorithm provides intuitive directional movement by:
- Using edge midpoints as reference points
- Filtering candidates by directional constraint
- Selecting the closest candidate by Euclidean distance

This approach is robust, flexible, and aligns with user expectations for spatial navigation.
