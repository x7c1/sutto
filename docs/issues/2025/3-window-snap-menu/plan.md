# Window Snap Menu Implementation

## Overview
Implement a window management feature that monitors window dragging and displays a snap menu when the cursor reaches screen edges.
Users can drop windows onto preset buttons to resize and position them automatically.

## Background
- Current GNOME Shell window snapping features lack sufficient functionality
- Need more flexible preset layouts for window organization
- Future extensions will include window categorization and app-specific presets
- Initial implementation focuses on core dragging and snapping functionality

## Requirements

### Functional Requirements
- Monitor window drag operations on the desktop
- Detect when mouse cursor reaches screen edges (left/right/top/bottom)
- Display snap menu at cursor position when edge is reached
- Provide two preset buttons in the menu:
  - Left half of screen (50% width, full height, aligned left)
  - Right half of screen (50% width, full height, aligned right)
- Apply selected preset when window is dropped on a button
- Same preset options available for all screen edges

### Technical Requirements
- Compatible with GNOME Shell 42
- Written in TypeScript
- Follow existing project structure and conventions
- No new external dependencies if possible

### Non-Requirements (Future Work)
- Window categorization
- App-specific presets
- Additional preset layouts beyond left/right half
- Multi-monitor support (assumed single monitor for now)

## Implementation Plan

### Phase 1: Window Drag Monitoring
- Research GNOME Shell APIs for window drag detection
  - Investigate Clutter drag-and-drop events
  - Identify how to get window object being dragged
  - Find APIs to track mouse cursor position
- Implement drag event listeners
- Test drag detection with console logging

### Phase 2: Edge Detection
- Implement screen edge detection logic
  - Get screen dimensions from GNOME Shell
  - Define edge trigger zones (10 pixels from each edge)
  - Detect when cursor enters edge zones during drag
  - Implement 0.5 second delay timer before triggering menu
- Test edge detection with visual feedback

### Phase 3: Snap Menu UI
- Design menu widget structure
  - Create 300px × 300px container for preset buttons
  - Create text-only buttons (no icons in initial version)
  - Add close button for manual dismissal
  - Position menu at cursor location
- Implement menu display/hide logic
  - Show menu 0.5 seconds after edge is reached during drag
  - Hide menu when window is dropped on preset button
  - Hide menu when cursor leaves edge
  - Hide menu when close button is clicked
- Style menu to match GNOME Shell theme

### Phase 4: Preset Implementation
- Define preset data structure
  - Window position (x, y)
  - Window size (width, height)
  - Calculate positions based on screen dimensions
- Implement left half preset
- Implement right half preset
- Test preset calculations on different screen sizes

### Phase 5: Window Manipulation
- Research GNOME Shell window manipulation APIs
  - Find methods to move window
  - Find methods to resize window
  - Identify any constraints or limitations
- Implement drop detection on preset buttons
- Apply preset to dropped window
- Handle edge cases (window min/max size constraints)

### Phase 6: Integration and Testing
- Integrate all components
- Test complete user flow:
  1. Start dragging window
  2. Move to screen edge
  3. Menu appears
  4. Drop on preset button
  5. Window resizes and moves
- Test with various window types and applications
- Verify GNOME Shell 42 compatibility

### Phase 7: Polish and Documentation
- Add error handling
- Optimize performance
- Update README with new feature description
- Document code with comments
- Create user guide if needed

## Timeline Estimate
- Phase 1: 3 points
- Phase 2: 2 points
- Phase 3: 5 points
- Phase 4: 2 points
- Phase 5: 4 points
- Phase 6: 3 points
- Phase 7: 2 points
- **Total: 21 points**

## Technical Considerations

### GNOME Shell APIs to Investigate
- `Meta.Window` - Window manipulation
- `Meta.Display` - Screen information and window events
- `Shell.Global` - Global shell state
- `Clutter.Actor` - UI elements and drag-drop
- `St.Widget` - Styled widgets for menu

### Potential Challenges
- Finding the correct API for drag event monitoring
- Determining when a window drag starts vs. normal mouse movement
- Ensuring menu doesn't interfere with normal drag operations
- Handling multi-monitor setups (deferred to future)
- Performance impact of continuous cursor position monitoring

### Design Decisions
- Menu appearance location: At cursor position (specified by user)
- Edge trigger zone size: 10px from screen edges (adjustable based on usability testing)
- Menu appearance timing: 0.5 second delay after reaching edge
- Menu visual style: Text-only buttons for initial implementation
- Menu size: 300px × 300px (adjustable if too small)
- Menu closing: Automatically closes on drop, when cursor leaves edge, or via close button
- Drop detection: Immediate application on mouse release (no hover time required)
- Existing code: Implement from scratch while preserving ReloadButton functionality

## Success Criteria
- User can drag any window to screen edge
- Menu appears reliably at cursor position
- Dropping on left/right preset buttons correctly resizes and positions window
- Feature works smoothly without performance issues
- Compatible with GNOME Shell 42

## Future Enhancements (Not in Scope)
- Additional preset layouts (quarters, thirds, maximize, etc.)
- Window categorization by type/function
- App-specific custom presets
- Preset management UI
- Multi-monitor support
- Keyboard shortcuts for presets
- Animation effects during window transformation
