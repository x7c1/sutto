# Titlebar Click Feature Investigation

## Goal

Add a feature to show the Sutto layout panel when a user double-clicks (or clicks) on a window's title bar, instead of maximizing the window.

## Motivation

- Provide quick access to layout panel without keyboard shortcuts or drag operations
- More intuitive UX for users accustomed to titlebar interactions
- Better integration with multi-monitor workflows

## Investigation Summary

### Approaches Attempted

#### 1. Global Stage Event Handlers
**Approach:** Connect to `global.stage` with `button-press-event` or `captured-event`

**Result:** ❌ Failed - Events never fire for titlebar clicks

**Code:**
```typescript
global.stage.connect('button-press-event', (_actor, event) => { ... });
global.stage.connect('captured-event', (_actor, event) => { ... });
```

**Reason:** Stage events don't reach window decorations (titlebars) managed by Mutter.

---

#### 2. Window Actor Event Handlers
**Approach:** Connect `button-press-event` to each window's Clutter actor

**Result:** ❌ Failed - Events never fire for any clicks on windows (titlebar or content area)

**Code:**
```typescript
const actor = window.get_compositor_private() as Clutter.Actor;
actor.connect('button-press-event', (_actor, event) => { ... });
```

**Reason:** Window actors in GNOME Shell don't receive button-press events. The event system doesn't propagate clicks to window actors.

---

#### 3. Grab Operation Monitoring
**Approach:** Monitor `grab-op-begin` and `grab-op-end` to detect very short grabs (< 50ms) as "clicks"

**Result:** ❌ Failed - Grab operations only trigger when mouse is moved (drag), not for clicks

**Code:**
```typescript
global.display.connect('grab-op-begin', (_display, window, op) => { ... });
global.display.connect('grab-op-end', (_display, window, op) => { ... });
```

**Reason:** Clicking without moving mouse doesn't trigger grab operations.

---

#### 4. Window Maximize Detection
**Approach:** Monitor `size-changed` signal to detect maximize events, intercept and show panel instead

**Result:** ❌ Failed - Visual glitches (window briefly starts maximizing before being cancelled), unreliable cancellation

**Code:**
```typescript
window.connect('size-changed', () => {
  if (wasMaximized === false && isNowMaximized === true) {
    window.unmaximize();
    showPanel();
  }
});
```

**Issues:**
- Window briefly flashes to maximized state before being cancelled
- Unmaximize doesn't always work in time
- Poor UX with visible stuttering

---

#### 5. Top Panel Double-Click
**Approach:** Detect double-clicks on the GNOME top panel (similar to Unite Shell extension)

**Result:** ✅ Technically works, but ❌ Impractical for multi-monitor setups

**Code:**
```typescript
Main.panel.connect('button-press-event', (_actor, event) => {
  const clickCount = event.get_click_count && event.get_click_count();
  // Manual timing detection when get_click_count() unavailable
});
```

**Issues:**
- In multi-monitor environments, users must move cursor to primary monitor's top panel
- Defeats the purpose of quick access
- Not ergonomic for large monitor setups

---

#### 6. Titlebar Middle-Click
**Approach:** Detect middle-click (wheel button) on window actors

**Result:** ❌ Failed - Same as approach #2, window actors don't receive button events

---

### API Limitations Discovered

#### Meta.Window Signals
Available signals on `Meta.Window`:
- `focus`, `position-changed`, `size-changed`, `raised`, `shown`, `workspace-changed`, etc.
- **No signals for button presses or clicks**

#### Clutter Event System
- Stage events don't reach window decorations
- Window actor events never fire for button presses
- Mutter handles titlebar interactions at a lower level than GNOME Shell extensions can access

#### event.get_click_count()
- Method exists but returns `undefined` in GNOME Shell 46
- API was removed/changed between GNOME 41 and 42 (Unite Shell issue #290)
- Requires manual timing-based double-click detection

## Conclusion

**Titlebar click detection is not possible with GNOME Shell extension APIs.**

The titlebar is managed by Mutter (the window manager) at a level below what GNOME Shell extensions can access. The Clutter event system doesn't propagate button events to window actors, and there are no Meta.Window signals for user interactions.

### Why This Is Hard

1. **Architectural Separation:** GNOME Shell (compositor) and Mutter (window manager) have separate responsibilities. Titlebar decorations are Mutter's domain.

2. **Event Propagation:** Click events on titlebars are consumed by Mutter before reaching the Clutter scene graph that extensions can monitor.

3. **API Limitations:** GNOME Shell extension APIs don't provide low-level access to X11/Wayland events or window manager internals.

## Alternative Solutions

### Implemented
- ✅ **Keyboard shortcuts** - Works well, already implemented
- ✅ **Drag to screen edge** - Core feature, works perfectly

### Rejected
- ❌ Titlebar double-click - Not possible
- ❌ Top panel clicks - Impractical for multi-monitor
- ❌ Maximize interception - Poor UX with glitches

### Not Attempted
- Window menu integration (right-click menu on titlebar) - Possible but intrusive
- Custom keyboard shortcuts for each monitor - Complex configuration

## Recommendation

**Remove the attempted titlebar click feature** and focus on the existing, working interaction methods:
1. Keyboard shortcut to show panel for focused window
2. Drag window to screen edge to show panel

These methods work reliably and provide good UX without architectural limitations.

## Related Issues

- [Unite Shell #290](https://github.com/hardpixel/unite-shell/issues/290) - Titlebar double-click broke in GNOME 42
- Similar limitations affect many GNOME Shell extensions attempting window interaction

## Files to Clean Up

- `src/app/double-click/double-click-handler.ts` - Remove entire file
- `src/settings/preferences.ts` - Remove middle-click toggle
- `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml` - Remove `show-on-double-click` key
- `src/settings/extension-settings.ts` - Remove `getShowOnDoubleClick()` method
- `src/app/controller.ts` - Remove DoubleClickHandler integration
