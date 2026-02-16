# Issues Encountered During Implementation

This document summarizes issues that were not anticipated in the original plan.md.

## 1. Module System Incompatibility (prefs.js)

### Problem
- GTK4 preferences require different module system than extension code
- Initial attempt used ES6 imports (`import Adw from 'gi://Adw'`) which failed with "Dynamic require not supported"
- CommonJS format caused "module is not defined" error

### Solution
- Use GJS imports API: `const Adw = imports.gi.Adw`
- Use IIFE format for esbuild instead of CommonJS
- Export functions via footer injection

### Code
```javascript
// esbuild.config.js - prefs.js build
format: 'iife',
globalName: 'prefs',
footer: {
  js: `
var init = prefs.default.init;
var fillPreferencesWindow = prefs.default.fillPreferencesWindow;
`,
}
```

## 2. GType System Limitations

### Problem
- TypeScript class inheritance with GTK widgets failed with "Tried to construct an object without a GType"
- Cannot extend `Adw.PreferencesGroup` or other GTK classes

### Solution
- Use flat structure instead of class inheritance
- Directly instantiate GTK/Adw widgets without extending them

### Example
```typescript
// ❌ Doesn't work
class ShortcutRow extends Adw.ActionRow { }

// ✅ Works
const row = new Adw.ActionRow({ title: '...' });
```

## 3. GNOME Shell 42 Preferences API Changes

### Problem
- `init()` function in prefs.js receives limited metadata
- Only provides: `uuid, name, description, url, version`
- Missing: `dir`, `path` properties needed to locate schema files

### Solution
- Construct extension directory path manually from UUID
- Use `GLib.get_home_dir()` + UUID to build path

### Code
```typescript
function init(metadata: any) {
  extensionUuid = metadata.uuid;
}

function fillPreferencesWindow(window: Adw.PreferencesWindow): void {
  const homeDir = imports.gi.GLib.get_home_dir();
  const extensionPath = `${homeDir}/.local/share/gnome-shell/extensions/${extensionUuid}`;
  const schemaPath = `${extensionPath}/schemas`;
  // ...
}
```

## 4. Reloader Not Copying Directories

### Problem
- Original reloader implementation only copied regular files
- Skipped all directories including `schemas/`
- This caused GSettings schema not found error in development mode

### Solution
- Add recursive directory copying to reloader
- Implement `copyDirectoryRecursive()` method

### Code Change
```typescript
// src/reloader/reloader.ts
if (fileType === Gio.FileType.REGULAR) {
  sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
} else if (fileType === Gio.FileType.DIRECTORY) {
  // NEW: Recursively copy directories
  this.copyDirectoryRecursive(sourceFile, destFile);
}
```

## 5. GTK4 MessageDialog Deprecated

### Problem
- `Gtk.MessageDialog` is deprecated in GTK4
- Dialog creation silently failed without errors

### Solution
- Use custom `Gtk.Window` instead
- Build dialog manually with Box and Label widgets

### Code
```typescript
const dialog = new Gtk.Window({
  transient_for: window,
  modal: true,
  title: 'Press shortcut keys',
});

const box = new Gtk.Box({
  orientation: Gtk.Orientation.VERTICAL,
  spacing: 12,
});

const label = new Gtk.Label({
  label: 'Press Escape to cancel or BackSpace to clear',
});

box.append(label);
dialog.set_child(box);
```

## 6. Reloader UUID Suffix Issue

### Problem
- Settings button used hardcoded `'sutto@x7c1.github.io'`
- Reloader adds suffix like `-reload-1764962070653074`
- Caused "Extension doesn't exist" error

### Solution
- Pass `ExtensionMetadata` through Extension → Controller → MainPanel
- Use actual `metadata.uuid` instead of hardcoded string

### Code Path
```typescript
// extension.ts
this.controller = new Controller(settings, metadata);

// controller.ts
this.mainPanel = new MainPanel(metadata);

// main-panel/index.ts
private openPreferences(): void {
  const uuid = this.metadata.uuid; // Use actual UUID
  // ...
}
```

## Summary of Root Causes

1. **Documentation Gap**: GTK4/GJS APIs are poorly documented for GNOME Shell extensions
2. **Runtime vs Build Time**: Different module systems for extension vs preferences
3. **Type System Mismatch**: TypeScript OOP doesn't map to GType system
4. **Metadata API Changes**: GNOME Shell 42 changed what's available in prefs context
5. **Development Tools**: Reloader needed enhancement for complete file copying

## Lessons Learned

- Always test preferences UI early in implementation
- GJS imports API is required for GTK4 preferences, not ES6 modules
- Avoid class inheritance with GTK widgets
- Development tools (reloader) need maintenance alongside features
- Plan for differences between development (reloader) and production environments
