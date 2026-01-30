# Layout History

## Definition

**Layout History** remembers which [Layouts](../layout/) users have selected for specific applications and windows. When a window is opened, Layout History suggests the most appropriate layout based on previous selections.

The system uses a matching strategy to find suggestions:

1. **Application + Window Title**: Most specific match (e.g., Firefox showing Gmail)
2. **Application only**: Fallback when the exact title hasn't been seen before (e.g., any Firefox window)

Layout History is scoped to the active [Space Collection](../space-collection/)—suggestions from one collection do not appear in another.

## Examples

- **Same application, same context**: User opens Firefox to Gmail and previously used "wide split" for Gmail. Layout History suggests "wide split" again
- **Same application, different context**: User opens Firefox to GitHub. Even though they used "wide split" for Gmail, Layout History suggests "full screen" because that's what they used for GitHub
- **New application**: User opens an application for the first time. No suggestion is highlighted until they make a selection

## Collocations

- record (a layout selection in Layout History)
- suggest (a layout from Layout History)
- lookup (a layout in Layout History)

## Related Concepts

- See [Layout](../layout/) for what is being suggested
- See [Space Collection](../space-collection/) for the boundary within which history applies
- See [Main Panel](../main-panel/) for where suggestions are displayed
