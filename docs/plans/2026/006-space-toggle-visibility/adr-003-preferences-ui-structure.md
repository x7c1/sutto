# ADR: Preferences UI Structure

## Status

Accepted

## Context

The Space toggle visibility feature adds a new settings section to the Preferences window. We need to decide how to organize the UI as the number of Spaces can grow, potentially making the window very long vertically.

Current Preferences UI only has keyboard shortcut settings. This feature adds Space management with visual previews (GTK Miniature Space) for each Space.

## Options

### Option A: Single Page with Groups

```
PreferencesWindow
└── PreferencesPage
    ├── PreferencesGroup "Keyboard Shortcuts"
    └── PreferencesGroup "Spaces"
        ├── Space 1 (Miniature + Switch)
        ├── Space 2 (Miniature + Switch)
        └── ...
```

**Pros:**
- Simple implementation
- All settings visible in one place
- `Adw.PreferencesPage` has built-in scrolling

**Cons:**
- UI becomes long vertically as Spaces increase
- Mixed concerns (shortcuts and spaces) on same page
- Less scalable for future settings

### Option B: Multiple Pages (Sidebar Navigation)

```
PreferencesWindow
├── PreferencesPage "General" (icon: preferences-system-symbolic)
│   └── PreferencesGroup "Keyboard Shortcuts"
└── PreferencesPage "Spaces" (icon: view-grid-symbolic)
    └── PreferencesGroup
        ├── Space 1 (Miniature + Switch)
        ├── Space 2 (Miniature + Switch)
        └── ...
```

**Pros:**
- Clear separation of concerns
- Scalable for future settings categories
- Common pattern in complex extensions (Dash to Panel, etc.)
- Sidebar navigation appears automatically with multiple pages

**Cons:**
- Slightly more complex implementation
- User needs to navigate between pages

### Option C: Expandable Rows

```
PreferencesPage
└── PreferencesGroup "Spaces"
    ├── ExpanderRow "Space 1" (collapsed)
    │   └── Miniature Space + Switch
    └── ExpanderRow "Space 2" (collapsed)
        └── Miniature Space + Switch
```

**Pros:**
- Compact vertical space
- User can expand only what they need

**Cons:**
- Must expand to see Space visualization
- Defeats purpose of visual identification
- Less intuitive UX

## Decision

**Option B: Multiple Pages (Sidebar Navigation)**

Adding multiple `Adw.PreferencesPage` instances to the `Adw.PreferencesWindow` creates automatic sidebar navigation between pages.

Primary reasons:
1. **Scalability**: Future settings can be added to appropriate pages
2. **Separation of concerns**: General settings vs Space management are distinct categories
3. **Industry pattern**: Common approach in extensions with complex preferences
4. **Better UX**: Spaces page can be dedicated to visual Space management

## Implementation

```typescript
export function buildPreferencesUI(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
  // General page
  const generalPage = new Adw.PreferencesPage({
    title: 'General',
    icon_name: 'preferences-system-symbolic',
  });
  // ... keyboard shortcuts group
  window.add(generalPage);

  // Spaces page
  const spacesPage = new Adw.PreferencesPage({
    title: 'Spaces',
    icon_name: 'view-grid-symbolic',
  });
  // ... spaces management group
  window.add(spacesPage);
}
```

## Consequences

- Preferences window will show sidebar navigation when opened
- Existing keyboard shortcut settings move to "General" page
- New Space management UI lives on dedicated "Spaces" page
- Future settings categories can be added as new pages

## References

- [Adw.PreferencesWindow](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.0/class.PreferencesWindow.html)
- [GNOME JavaScript - Preferences](https://gjs.guide/extensions/development/preferences.html)
