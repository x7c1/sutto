# Snap Menu Layout Groups

Status: Completed

## Overview

Redesign the snap menu to use a layout group concept where related layouts are visually grouped together. Each layout group displays as a miniature screen preview with layout buttons positioned according to their actual screen positions.

## Current State

The snap menu (`src/snap/snap-menu.ts`) currently displays individual layout buttons in a simple vertical list:
- Left Half layout button
- Right Half layout button
- Cancel button

Each button spans the full menu width and layouts are not visually grouped.

## Goals

Transform the snap menu to use layout groups that:
- Group related layouts together visually
- Display each group as a miniature screen preview (matching screen aspect ratio)
- Position layout buttons within groups according to their actual screen coordinates
- Support stacking order (z-index) for overlapping layouts
- Scale groups to fit within the current 300px menu width

## Requirements

### Layout Group Structure

- Define layout groups in code (future: user-configurable via settings)
- Each layout group contains multiple related layouts
- Groups are displayed vertically in the menu
- Each group maintains screen aspect ratio

### Initial Layout Groups

**Group 1: Two-Way Split**
- Left Half (x: 0, y: 0, width: 0.5, height: 1)
- Right Half (x: 0.5, y: 0, width: 0.5, height: 1)

**Group 2: Three-Way Split**
- Left Third (x: 0, y: 0, width: 0.333, height: 1)
- Center Third (x: 0.333, y: 0, width: 0.334, height: 1)
- Right Third (x: 0.667, y: 0, width: 0.333, height: 1)

### Layout Properties

Each layout needs:
- Existing properties: label, x, y, width, height
- New property: zIndex (stacking order for overlapping layouts)

### Visual Design

- Groups arranged vertically with 10px spacing between them
- Each group is a container with screen aspect ratio
- Layout buttons positioned within group based on x, y, width, height
- Groups scaled to fit 300px menu width
- Visual distinction between groups (borders, backgrounds consistent with current button style)
- Higher zIndex layouts render on top when overlapping
- Layout buttons have no labels (visual position is self-explanatory)
- Layout buttons display only borders (no inner content)
- Layout buttons have 3px margin to prevent direct adjacency
- Menu height adjusts dynamically based on number of groups

## Technical Approach

### Data Structure Changes

```typescript
export interface SnapLayout {
    label: string;
    x: number;        // percentage (0-1)
    y: number;        // percentage (0-1)
    width: number;    // percentage (0-1)
    height: number;   // percentage (0-1)
    zIndex: number;   // stacking order
}

export interface SnapLayoutGroup {
    name: string;
    layouts: SnapLayout[];
}
```

### Implementation Steps

- Update SnapLayout interface to include zIndex property
- Create SnapLayoutGroup interface
- Define initial layout groups (two-way and three-way splits)
- Modify menu construction to create group containers instead of flat list
- Calculate group dimensions based on screen aspect ratio and menu width
- Position layout buttons within groups using absolute positioning
- Apply zIndex styling to handle overlapping layouts
- Update layout selection logic to work with grouped structure
- Update getLayoutAtPosition to work with new grouped structure
- Ensure menu follows cursor during drag (updatePosition functionality)
- Ensure existing functionality (hover, click, auto-hide) continues to work

### Scaling Calculations

- Get screen dimensions from global.screen_width and global.screen_height
- Calculate screen aspect ratio
- Set group width to fit menu (e.g., 276px for 300px menu minus padding)
- Calculate group height from width and aspect ratio
- Scale layout button positions: buttonX = groupWidth × layout.x
- Scale layout button sizes: buttonWidth = groupWidth × layout.width
- Add 3px margin to each layout button
- Calculate total menu height: title + sum(group heights) + group spacing (10px) + cancel button

### Visual Hierarchy

- Menu container (vertical)
  - Title
  - Group 1 container (positioned)
    - Layout button 1 (absolute position)
    - Layout button 2 (absolute position)
  - Group 2 container (positioned)
    - Layout button 1 (absolute position)
    - Layout button 2 (absolute position)
    - Layout button 3 (absolute position)
  - Cancel button

## Future Enhancements

(Not in current scope)
- User-configurable layout groups via settings
- More complex layouts (quadrants, corners, etc.)
- Group labels/titles
- Visual preview of window position
- Drag-and-drop layout customization

## Testing Considerations

- Verify layouts render at correct positions within groups
- Test overlapping layouts with different zIndex values
- Confirm click detection works with absolute positioned buttons
- Check scaling calculations with different screen aspect ratios
- Ensure menu width stays at 300px with dynamic height
- Verify getLayoutAtPosition works with grouped structure during drag
- Test menu position updates while dragging (follows cursor)
- Verify 3px margin between adjacent layout buttons
- Confirm buttons display only borders without labels or content
- Verify auto-hide and outside-click behavior still works
- Check 10px spacing between groups

## Success Criteria

- Layout groups display vertically in menu
- Each group maintains screen aspect ratio
- Layout buttons positioned according to screen coordinates
- Two initial groups implemented (two-way and three-way splits)
- All existing menu functionality preserved
- Code passes `npm run check`
