# Keyboard Layout Navigation Feature

## Overview

Add keyboard navigation support to the layout selection panel, allowing users to navigate between layout buttons using arrow keys (↑↓←→) and Vim-style keys (hjkl), and select layouts using the Enter key. The focused button will display using the same visual style as mouse hover.

## Type

New feature addition

## Current Situation

Currently, the layout selection panel supports:
- **Panel Display**: Triggered by dragging a window to screen edge or pressing a keyboard shortcut (`show-panel-shortcut`)
- **Layout Selection**: User must click a layout button with the mouse

The panel cannot be operated using only the keyboard, requiring mouse interaction for layout selection.

## Requirements

### Functional Requirements

- Navigate between layout buttons using arrow keys (↑, ↓, ←, →)
- Navigate using Vim-style keys (h, j, k, l) as alternatives
- Select the currently focused layout using Enter key
- Display focused button with the same visual style as mouse hover
- Automatic focus when panel is shown (selected layout if exists, otherwise top-left layout)
- Focus remains on current layout when no candidate exists in the intended direction (no wrap-around)
- Coexist with mouse operations without conflicts

### Technical Requirements

- Follow existing architectural patterns
- Only active when panel is visible
- Use existing CSS hover styles for focus state
- Handle multi-category, multi-group layouts correctly
- Minimal changes to existing code

## Architecture Analysis

### Current Panel Structure

```
Categories (vertical)
  └─ Category Rows (horizontal, max 3 displays per row)
      └─ Miniature Displays (groups)
          └─ Layout Buttons (positioned absolutely within display)
```

**Key Files:**
- `/projects/planner/src/app/main-panel/index.ts` - Main panel management
- `/projects/planner/src/app/main-panel/layout-selector.ts` - Button tracking, layout selection
- `/projects/planner/src/app/ui/layout-button.ts` - Button creation, hover styles
- `/projects/planner/src/app/ui/category.ts` - Category structure with wrapping rows
- `/projects/planner/src/app/constants.ts` - Color constants and dimensions

### Button Organization

- Categories are stacked vertically
- Within each category, groups (displays) are arranged horizontally in rows (max 3 per row)
- Within each display, layout buttons are positioned absolutely based on their layout coordinates
- All buttons tracked in `layoutButtons: Map<St.Button, Layout>` in `MainPanel`

### Existing Keyboard Shortcuts

Pattern: `Main.wm.addKeybinding()` with GSettings integration

Current shortcuts:
- `show-panel-shortcut`: Shows panel at window center (Controller, always registered)
- `hide-panel-shortcut`: Hides panel (Controller, dynamically registered when panel shows)

### Button Visual States

Defined in `/projects/planner/src/app/ui/layout-button.ts`:
- **Normal**: `BUTTON_BG_COLOR = 'rgba(80, 80, 80, 0.6)'`
- **Hover**: `BUTTON_BG_COLOR_HOVER = 'rgba(120, 120, 120, 0.8)'`
- **Selected**: `BUTTON_BG_COLOR_SELECTED = 'rgba(100, 150, 250, 0.7)'`
- **Priority**: Hover > Selected > Normal (managed by `getButtonStyle()`)

Each button stores metadata:
- `_isSelected`: Whether this layout is currently selected
- `_buttonWidth`, `_buttonHeight`: Button dimensions
- `_debugConfig`: Debug configuration

## Implementation Plan

### Design Approach

Create a new component `MainPanelKeyboardNavigator` to encapsulate keyboard navigation logic. This provides:

**Benefits:**
- **Separation of Concerns**: Prevents `MainPanel` from becoming bloated
- **Maintainability**: Changes are isolated to the keyboard navigation module
- **Testability**: Can be tested independently

**Implementation Strategy:**
- Treat keyboard focus as equivalent to mouse hover for styling purposes
- Reuse existing `getButtonStyle()` function to apply hover-like styles
- Use midpoint-based distance calculation for directional navigation
- Register keyboard event handlers on the panel container

### Component Design

```typescript
class MainPanelKeyboardNavigator {
  // State
  private focusedButton: St.Button | null = null;
  private layoutButtons: Map<St.Button, Layout>;
  private keyEventId: number | null = null;
  private onLayoutSelected: ((layout: Layout) => void) | null = null;

  // Public API
  enable(container, layoutButtons, onLayoutSelected): void
  disable(): void

  // Internal
  handleKeyPress(event): boolean
  findNextLayout(direction): St.Button | null
  calculateEdgeMidpoint(button, edge): Point
  applyFocusStyle(button): void
  removeFocusStyle(button): void
  selectCurrentButton(): void
}

interface Point {
  x: number;
  y: number;
}
```

### Focus State Management

Apply focus style by setting a metadata flag and using `getButtonStyle()`:

```typescript
private applyFocusStyle(button: St.Button): void {
  const buttonWithMeta = button as any;

  // Mark button as keyboard-focused
  buttonWithMeta._isFocused = true;

  // Apply focused style (same as hover style)
  const style = getButtonStyle(
    true,  // isHovered = true to apply hover style
    buttonWithMeta._isSelected,
    buttonWithMeta._buttonWidth,
    buttonWithMeta._buttonHeight,
    buttonWithMeta._debugConfig
  );
  button.set_style(style);
}

private removeFocusStyle(button: St.Button): void {
  const buttonWithMeta = button as any;

  // Remove keyboard focus flag
  buttonWithMeta._isFocused = false;

  // Restore normal style
  const style = getButtonStyle(
    false,  // isHovered = false
    buttonWithMeta._isSelected,
    buttonWithMeta._buttonWidth,
    buttonWithMeta._buttonHeight,
    buttonWithMeta._debugConfig
  );
  button.set_style(style);
}
```

**Rationale:**
- Adds `_isFocused` metadata flag to track keyboard focus state
- Reuses existing style logic, avoiding duplication
- Maintains visual consistency with mouse hover
- Keyboard focus takes priority over mouse hover (see Mouse Interaction Handling)

### Navigation Logic

The navigation logic uses a **midpoint-based distance calculation** algorithm. The implementation handles:

- **Key mapping**: Arrow keys (↑↓←→) and Vim-style keys (hjkl) mapped to directional movement, Enter/KP_Enter for selection
- **Edge midpoint calculation**: Calculates the midpoint of the current button's relevant edge based on direction
- **Candidate filtering**: Filters layouts that are in the intended direction (e.g., right layouts have left edge to the right of current right edge)
- **Distance-based selection**: Selects the closest layout by calculating Euclidean distance between edge midpoints
- **Focus management**: Updates focus state and applies/removes visual styles
- **Layout selection**: Triggers the layout selection callback when Enter is pressed

For detailed explanation of the navigation algorithm, including step-by-step procedures and examples, see [navigation-logic.md](./navigation-logic.md).

### Event Handling

Register keyboard event handler on the panel container:

```typescript
enable(
  container: St.BoxLayout,
  layoutButtons: Map<St.Button, Layout>,
  onLayoutSelected: (layout: Layout) => void
): void {
  this.container = container;
  this.layoutButtons = layoutButtons;
  this.onLayoutSelected = onLayoutSelected;

  // Set keyboard focus
  container.grab_key_focus();

  // Register key event handler
  this.keyEventId = container.connect('key-press-event', (_actor, event) => {
    return this.handleKeyPress(event);
  });

  // Initialize focus: selected layout if exists, otherwise top-left layout
  let initialButton: St.Button | null = null;

  // Find selected button if exists
  for (const [button, layout] of this.layoutButtons.entries()) {
    const buttonWithMeta = button as any;
    if (buttonWithMeta._isSelected) {
      initialButton = button;
      break;
    }
  }

  // If no selected button, find top-left button
  if (!initialButton) {
    let minY = Infinity;
    let minX = Infinity;
    for (const button of this.layoutButtons.keys()) {
      const [x, y] = button.get_transformed_position();
      if (y < minY || (y === minY && x < minX)) {
        minY = y;
        minX = x;
        initialButton = button;
      }
    }
  }

  if (initialButton) {
    this.focusedButton = initialButton;
    this.applyFocusStyle(initialButton);
  }
}

disable(): void {
  if (this.keyEventId !== null && this.container) {
    this.container.disconnect(this.keyEventId);
    this.keyEventId = null;
  }

  if (this.focusedButton) {
    this.removeFocusStyle(this.focusedButton);
    this.focusedButton = null;
  }

  // Do not clear layoutButtons, as it's a reference from MainPanel
}
```

### Mouse Interaction Handling

To ensure keyboard focus takes priority over mouse hover, modify the hover event handlers in `layout-button.ts`:

```typescript
// In createLayoutButton() function
button.connect('enter-event', () => {
  const buttonWithMeta = button as any;
  // Only apply hover style if button is not keyboard-focused
  if (!buttonWithMeta._isFocused) {
    const style = getButtonStyle(
      true,  // isHovered
      buttonWithMeta._isSelected,
      buttonWithMeta._buttonWidth,
      buttonWithMeta._buttonHeight,
      buttonWithMeta._debugConfig
    );
    button.set_style(style);
  }
});

button.connect('leave-event', () => {
  const buttonWithMeta = button as any;
  // Only remove hover style if button is not keyboard-focused
  if (!buttonWithMeta._isFocused) {
    const style = getButtonStyle(
      false,  // isHovered
      buttonWithMeta._isSelected,
      buttonWithMeta._buttonWidth,
      buttonWithMeta._buttonHeight,
      buttonWithMeta._debugConfig
    );
    button.set_style(style);
  }
});
```

**Behavior:**
- When a button has keyboard focus (`_isFocused = true`), mouse hover events are ignored
- The focused button retains its visual style even when the mouse hovers over it
- Mouse can still click on any button (including focused one) to select it
- When keyboard focus moves to another button, the previous button's `_isFocused` is cleared, allowing normal mouse hover behavior to resume

### Integration with MainPanel

**File:** `/projects/planner/src/app/main-panel/index.ts`

1. **Import** (line ~10):
```typescript
import { MainPanelKeyboardNavigator } from './keyboard-navigator';
```

2. **Add property** (line ~47):
```typescript
private keyboardNavigator: MainPanelKeyboardNavigator = new MainPanelKeyboardNavigator();
```

3. **Enable in show()** (line ~238, before `onPanelShownCallback`):
```typescript
// Enable keyboard navigation
const onLayoutSelected = this.layoutSelector.getOnLayoutSelected();
if (onLayoutSelected) {
  this.keyboardNavigator.enable(container, this.layoutButtons, onLayoutSelected);
}

// Notify that panel is shown
if (this.onPanelShownCallback) {
  this.onPanelShownCallback();
}
```

4. **Disable in hide()** (line ~249, after auto-hide cleanup):
```typescript
// Cleanup auto-hide
this.autoHide.cleanup();

// Disable keyboard navigation
this.keyboardNavigator.disable();

// Disconnect event handlers
```

## Implementation Steps

### Step 1: Create KeyboardNavigator Component

**File:** `/projects/planner/src/app/main-panel/keyboard-navigator.ts` (new file)

**Tasks:**
- Define class structure and properties
- Implement `handleKeyPress()` method
- Implement `findNextLayout()` method with midpoint-based distance calculation
- Implement `calculateEdgeMidpoint()` helper method
- Implement `applyFocusStyle()` and `removeFocusStyle()` methods
- Implement `selectCurrentButton()` method
- Implement `enable()` and `disable()` methods with smart initial focus logic

**Estimated:** 3 points

### Step 2: Modify layout-button.ts

**File:** `/projects/planner/src/app/ui/layout-button.ts`

**Changes:**
1. Export `getButtonStyle()` function (line ~51)
2. Modify `enter-event` handler to check `_isFocused` flag before applying hover style
3. Modify `leave-event` handler to check `_isFocused` flag before removing hover style

**Estimated:** 2 points

### Step 3: Integrate with MainPanel

**File:** `/projects/planner/src/app/main-panel/index.ts`

**Tasks:**
- Add import statement
- Add keyboardNavigator property
- Call enable() in show() method
- Call disable() in hide() method

**Estimated:** 1 point

### Step 4: Verify Clutter Key Codes

**File:** `/projects/planner/src/types/gnome-shell-42.d.ts` (reference only)

**Tasks:**
- Confirm Clutter key symbol definitions exist
- Verify KEY_Up, KEY_Down, KEY_Left, KEY_Right, KEY_h, KEY_j, KEY_k, KEY_l, KEY_Return, KEY_KP_Enter

**Estimated:** 1 point

### Step 5: Testing

**Test Cases:**
- Initial focus appears on selected layout when panel is shown (if layout is selected)
- Initial focus appears on top-left layout when no layout is selected
- Arrow keys (↑↓←→) navigate to visually closest layout in each direction
- Vim keys (hjkl) navigate correctly in all directions
- Enter key selects the focused layout
- Focused button displays with hover style
- Navigation stops at boundaries (no wrap-around)
- Focus remains on current layout when no candidate exists in the intended direction
- Mouse hover and keyboard focus coexist properly
- Multiple categories/groups work correctly
- Midpoint-based distance calculation selects correct layouts with irregular positioning

**Estimated:** 2 points

**Total Estimated:** 9 points

## Edge Cases

1. **No Candidate Found:**
   - When no layout exists in the intended direction (e.g., pressing right at the rightmost layout)
   - Behavior: Focus remains on current layout (no wrap-around)
   - See [navigation-logic.md](./navigation-logic.md) for detailed boundary conditions

2. **Irregular Layout Arrangements:**
   - The midpoint-based algorithm handles arbitrary positioning naturally
   - Works with different button sizes, irregular spacing, and non-aligned layouts
   - Always selects the visually closest layout based on edge midpoint distances

3. **Initial Focus:**
   - Automatically focus selected layout if exists, otherwise top-left layout
   - Top-left is determined by minimum Y coordinate, then minimum X coordinate
   - User can immediately start navigating

4. **Mouse and Keyboard Coexistence:**
   - **Priority**: Keyboard focus overrides mouse hover
   - When a button has keyboard focus (`_isFocused = true`):
     - Mouse hover events are ignored on that button
     - The focused style remains visible
     - Mouse clicks still work normally
   - When keyboard focus moves away from a button:
     - `_isFocused` flag is cleared
     - Mouse hover events resume normal behavior
   - This ensures the user always sees which button will be selected by Enter key

5. **Panel Re-display:**
   - Navigation state is recalculated each time panel shows
   - Handles dynamic category changes (e.g., debug mode)

6. **Focus Loss:**
   - Visual focus remains even if panel loses keyboard focus
   - Keyboard input re-enabled when panel regains focus

## Files to Modify

### New Files
- `/projects/planner/src/app/main-panel/keyboard-navigator.ts` - Core keyboard navigation class

### Modified Files
- `/projects/planner/src/app/main-panel/index.ts` - Integrate KeyboardNavigator (enable/disable calls)
- `/projects/planner/src/app/ui/layout-button.ts` - Export `getButtonStyle()` function, modify hover event handlers to respect `_isFocused` flag

### Reference Only
- `/projects/planner/src/app/main-panel/layout-selector.ts` - Layout selection logic reference
- `/projects/planner/src/app/ui/category.ts` - Category structure understanding
- `/projects/planner/src/app/constants.ts` - Color constants reference
- `/projects/planner/src/types/gnome-shell-42.d.ts` - Clutter key code definitions

## Expected Behavior

1. User displays panel (via drag or keyboard shortcut)
2. Selected layout is automatically focused if exists, otherwise top-left layout is focused (shown with hover style)
3. User navigates focus using arrow keys or hjkl
4. Focus moves to the visually closest layout in the intended direction based on edge midpoint distances
5. If no layout exists in the intended direction, focus remains on current layout
6. User presses Enter to select the focused layout
7. Layout is applied to the window and panel closes

**Keyboard Focus Priority:**
- Keyboard-focused buttons retain their visual style even when the mouse hovers over them
- This ensures the user always knows which button will be activated by the Enter key
- Mouse clicks work normally on all buttons, including the keyboard-focused one

## Success Criteria

- ✅ Arrow keys navigate between layout buttons in all directions
- ✅ Vim keys (hjkl) work as alternatives to arrow keys
- ✅ Enter key selects the currently focused layout
- ✅ Focused button displays with hover style (rgba(120, 120, 120, 0.8))
- ✅ Navigation uses midpoint-based distance calculation
- ✅ Selects the visually closest layout in the intended direction
- ✅ Handles irregular layouts and different button sizes correctly
- ✅ No wrap-around at boundaries (focus stays on current layout when no candidate found)
- ✅ Selected layout is automatically focused when panel appears (if exists)
- ✅ Top-left layout is automatically focused when no layout is selected
- ✅ Keyboard focus takes priority over mouse hover (focused style remains visible)
- ✅ Mouse clicks work normally on all buttons
- ✅ Works correctly with multiple categories and groups
- ✅ No TypeScript errors
- ✅ Build, check, and tests pass
