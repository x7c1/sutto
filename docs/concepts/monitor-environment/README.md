# Monitor Environment

## Definition

**Monitor Environment** represents a specific physical monitor configuration that Sutto automatically detects and manages.

Each Monitor Environment is identified by the combined geometry (position, width, height) of all connected monitors. When the physical setup changes—such as connecting to an external display or docking at a workstation—Sutto detects the new Monitor Environment and automatically activates the appropriate [Space Collection](../space-collection/).

## How It Works

1. **Detection**: Sutto monitors the physical display configuration
2. **Identification**: A unique identifier is generated from the geometry of all connected monitors
3. **Automatic Switching**: When a known Monitor Environment is detected, Sutto activates the [Space Collection](../space-collection/) that was last used with that environment
4. **Persistence**: The association between Monitor Environments and Space Collections is saved across sessions

## Examples

- **Home office**: User has a laptop with one external monitor. Sutto remembers they prefer the "2 Monitors - Wide" collection here
- **Meeting room**: User connects to a projector. Sutto detects a different Monitor Environment and switches to a simpler "2 Monitors - Standard" collection
- **Desk with ultrawide**: User docks at their main workstation with an ultrawide monitor. Sutto automatically activates their custom "Ultrawide Productivity" collection
- **Laptop only**: User unplugs all monitors. Sutto switches to a "1 Monitor" collection

## Collocations

- detect (a Monitor Environment)
- switch (to a Monitor Environment)
- identify (a Monitor Environment)
- save (a Monitor Environment)

## Technical Constraints

Monitor Environment switches the active Space Collection, but does not restore window layouts. Reliable window identification across sessions is technically difficult—window IDs change when applications restart, and there is no universal way to match windows to their previous positions.

## Related Concepts

- See [Space Collection](../space-collection/) for what gets activated when a Monitor Environment is detected
- See [Display](../display/) for the logical representation of monitors within a Space
