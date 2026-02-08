# Main Panel

## Definition

**Main Panel** is the interactive UI component that displays available [Layouts](../layout/) and allows users to select one to apply to their window.

When triggered, the Main Panel shows a visual representation of all available [Spaces](../space/), with each [Display](../display/) rendered as a miniature showing its layout options. Users can click a layout button or use keyboard navigation to select and apply a layout.

## What It Displays

- **Miniature Spaces**: Organized in rows, each Miniature Space shows a [Space's](../space/) monitor configuration
- **Miniature Displays**: Visual representations of each monitor within a Miniature Space
- **Layout Buttons**: Clickable buttons representing available layouts for each Display
- **Suggested Layout**: Based on [Layout History](../layout-history/), the previously-used layout for the current application is highlighted

## Behavior

- **Positioning**: When triggered by keyboard, appears centered on the focused window. When triggered by drag, follows the cursor while staying within screen boundaries
- **Auto-hide**: Hides automatically after a short period if not interacted with
- **Keyboard Navigation**: Arrow keys navigate between layout buttons, Enter applies the selected layout, Escape closes the panel

## Examples

- User presses the keyboard shortcut; the Main Panel appears centered on their Firefox window, with the "wide split" layout highlighted because that's what they used last time for Firefox
- User drags a window toward the screen edge; the Main Panel appears near the cursor showing available layouts for all Spaces

## Collocations

- show (the Main Panel)
- hide (the Main Panel)
- trigger (the Main Panel)

## Related Concepts

- See [Sutto](../sutto/) for how the Main Panel fits into the overall tool
- See [Space](../space/) for what is displayed in the Main Panel
- See [Layout](../layout/) for the options shown as buttons
- See [Layout History](../layout-history/) for how layout suggestions are determined
