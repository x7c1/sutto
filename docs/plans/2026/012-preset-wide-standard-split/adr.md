# ADR: Always Display Radio Buttons for SpaceCollection Selection

## Status

Accepted

## Context

The SpaceCollection selection UI uses radio buttons to allow users to choose the active collection. Previously, the code included a conditional check (`totalCollectionCount > 1`) to hide radio buttons when only one collection exists.

This conditional logic was removed because:
- It added unnecessary complexity
- It caused inconsistent UI behavior when importing new collections dynamically
- With the wide/standard preset split, at least two presets will always exist

## Decision

Always display radio buttons for all SpaceCollections, regardless of the total count.

## Consequences

### Positive
- Simpler, more consistent code
- No UI inconsistencies when importing collections
- Works well with the wide/standard preset split feature

### Negative
- None significant

## Technical Note: GTK4 Radio Button Behavior

GTK4 has a quirk where a single `Gtk.CheckButton` in a radio group renders as a checkbox instead of a radio button. By ensuring at least two presets always exist (through the wide/standard split), this issue is naturally avoided without requiring special handling.

