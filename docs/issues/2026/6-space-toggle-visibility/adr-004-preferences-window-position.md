# ADR: Preferences Window Position

## Status

Accepted

## Context

When opening the preferences window while the main panel is displayed, the preferences window appears on a different monitor or location, which is inconvenient for users. Ideally, the preferences window should appear near or aligned with the main panel's position.

The main panel tracks its position in `MainPanelState` (`panelX`, `panelY`) and can appear on any monitor based on cursor position. However, the preferences window is opened via `gnome-extensions prefs UUID` command, which spawns an external process that GNOME Shell manages.

## Options

### Option A: Custom Settings Dialog in Shell UI

Create a custom settings dialog that renders within the GNOME Shell UI (similar to the main panel), giving full control over positioning.

**Pros:**
- Full control over window position
- Can align perfectly with main panel location
- Consistent UX within the extension

**Cons:**
- Cannot be opened from GNOME Tweaks or Extensions app
- Requires reimplementing `Adw.PreferencesWindow` features (page navigation, search, etc.)
- Significant architectural change
- Dual maintenance if both approaches are needed

### Option B: Popover-based Settings

Embed settings UI as a Popover within the main panel.

**Pros:**
- Always appears at main panel location
- Simple positioning

**Cons:**
- Limited space for complex settings
- Cannot be opened from Tweaks/Extensions app
- Poor UX for extensive configuration

### Option C: Accept Current Behavior (Standard Preferences Window)

Keep using the standard `Adw.PreferencesWindow` and accept Wayland's positioning limitations.

**Pros:**
- Works with GNOME Tweaks and Extensions app
- Standard GNOME extension pattern
- No additional maintenance burden
- Benefits from Adwaita's built-in features

**Cons:**
- Cannot control window position on Wayland
- Window may appear on different monitor than main panel

## Decision

**Option C: Accept Current Behavior**

Wayland's security model intentionally prevents applications from specifying window positions. This is a platform limitation that affects all GNOME extensions, not specific to this project.

Primary reasons:

1. **Wayland limitation**: Applications cannot programmatically set window positions on Wayland for security reasons (prevents UI spoofing attacks)
2. **Ecosystem compatibility**: Standard preferences windows can be opened from GNOME Tweaks, Extensions app, and `gnome-extensions prefs` command
3. **Maintenance cost**: Implementing a custom Shell UI dialog would require duplicating the entire preferences UI or losing external access
4. **Industry standard**: This behavior is consistent with all other GNOME extensions

## Technical Background

### Wayland vs X11

On X11, applications could use `window.move(x, y)` to position windows. Wayland deliberately removed this capability:

- **Security**: Prevents malicious apps from overlaying phishing dialogs on other windows
- **Consistency**: Window management is the compositor's responsibility
- **Multi-monitor**: Prevents apps from fighting over window placement

### Current Implementation

Preferences are opened via subprocess:
```typescript
Gio.Subprocess.new(['gnome-extensions', 'prefs', uuid], Gio.SubprocessFlags.NONE);
```

GNOME Shell creates and positions the `Adw.PreferencesWindow`. The extension's `fillPreferencesWindow()` only configures the content, not the position.

## Consequences

- Users may need to move the preferences window manually when working on multi-monitor setups
- The extension remains compatible with standard GNOME tools
- No additional code complexity for window positioning workarounds

## References

- [Wayland Protocol - Security Design](https://wayland.freedesktop.org/docs/html/ch04.html)
- [GNOME Shell Extension Preferences](https://gjs.guide/extensions/development/preferences.html)
- [Adw.PreferencesWindow](https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1.0/class.PreferencesWindow.html)
