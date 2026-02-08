# Sutto

## Definition

**Sutto** is a window management tool for GNOME that allows users to snap windows to layouts.

Sutto's core philosophy is flexibility: users can freely define their own [Spaces](../space/), [Layout Groups](../layout-group/), and [Layouts](../layout/) to match their workflow. Instead of forcing a fixed set of window arrangements, Sutto provides a framework for users to build their ideal window management system.

When a user wants to snap a window, the [Main Panel](../main-panel/) appears showing available layouts. The user selects a layout, and the window is positioned and sized accordingly.

## Key Features

- **Customizable Layouts**: Users define exactly how windows should be arranged, using flexible expressions like fractions (`1/3`), percentages (`50%`), or pixel values (`400px`)
- **Multi-Monitor Support**: Each monitor can have different layout options, and Sutto remembers configurations for different [Monitor Environments](../monitor-environment/)

## How to Trigger

Sutto can be triggered in multiple ways:

- **Keyboard shortcut**: Press the configured shortcut to show the Main Panel centered on the focused window
- **Drag to edge**: Drag a window toward a screen edge to show the Main Panel at the cursor position

## Examples

- A developer sets up a "coding" Space with a large editor area on the left and a terminal on the right
- A designer creates a Space with reference images on one monitor and the design tool filling the other
- A user with an ultrawide monitor defines layouts that split the screen into thirds

## Collocations

- trigger (Sutto)
- configure (Sutto)

## Related Concepts

- See [Main Panel](../main-panel/) for the UI that appears when Sutto is triggered
- See [Space](../space/) for the virtual workspace containing layout configurations
- See [Layout](../layout/) for the individual window arrangements
