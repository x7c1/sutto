# Keyboard Shortcut for Main Panel

Status: Completed

## Overview

Implement keyboard shortcut functionality to invoke the main panel without requiring window dragging. This feature will allow users to quickly open the main panel using a configurable keyboard combination, making the extension more accessible and efficient for keyboard-centric workflows.

## Background

### Current Situation
- The main panel can only be invoked by dragging a window to screen edges
- No keyboard-based method exists to open the main panel
- Users who prefer keyboard workflows cannot access snap functionality efficiently

### Problem Statement
Users want to invoke the main panel using keyboard shortcuts for:
- Quick window management without using the mouse
- Accessing snap layouts when working with non-draggable windows
- Faster workflow when repeatedly applying layouts to multiple windows
- Better accessibility for users who prefer keyboard navigation

## Requirements

### Functional Requirements
- **Keyboard Invocation**: Open main panel at current cursor position when shortcut is pressed (when configured)
- **Shortcut Configuration**: Users can configure the keyboard shortcut via dedicated preferences UI
- **Preferences UI**: Native GNOME extension preferences window with keyboard shortcut picker
- **Default State**: No keyboard shortcut assigned by default (respects user's existing keybindings)
- **Target Window Selection**: Apply layout to the currently focused window
- **Cursor Positioning**: Main panel appears at current cursor position (similar to drag behavior)
- **Standard GNOME Integration**: Use GNOME Shell's built-in keybinding system (not D-Bus)

### Technical Requirements
- Must work with GNOME Shell 42 APIs
- Use GNOME Shell's keybinding system for native integration
- Follow GNOME extension conventions for keyboard shortcuts
- Integrate with existing Controller architecture
- No external dependencies or D-Bus setup required
- Default shortcut: None (disabled by default, user must explicitly configure)

### User Experience Requirements
- Shortcut works when any window is focused
- Main panel behavior identical to drag-triggered panel
- Layout selection history works the same way
- Graceful handling when no window is focused
- Preferences accessible via GNOME Extensions app (right-click → Preferences)
- Visual keyboard shortcut picker with real-time preview
- Clear indication of conflicting shortcuts

## Implementation Plan

### Phase 1: Preferences UI Foundation (New)

**Goal**: Create preferences window infrastructure using GTK4/Libadwaita

#### Overview
GNOME Shell 42 extensions can provide preferences UI via `prefs.js`. This creates a native preferences dialog accessible from the Extensions app.

#### Tasks
- Create TypeScript preferences implementation
- Set up GTK4 and Libadwaita for UI components
- Configure build system to compile preferences separately from extension

#### Files to Create
- **`src/prefs.ts`**: Main preferences entry point

**Important Note**: The import syntax for `prefs.ts` differs from `extension.ts`:
- Extension uses: `const Gtk = imports.gi.Gtk;` (GNOME Shell 42 style)
- Prefs uses: `import Gtk from 'gi://Gtk';` (ES6 modules style)

This is because preferences run in a separate GTK process, not in GNOME Shell.

  ```typescript
  import Gtk from 'gi://Gtk';
  import Adw from 'gi://Adw';
  import Gio from 'gi://Gio';

  export default class SnappaPreferences extends Adw.PreferencesGroup {
    private settings: Gio.Settings;

    constructor(params = {}) {
      super(params);

      // Load settings (schema from extension directory)
      this.settings = this.getSettings();

      // Build UI
      this.buildUI();
    }

    private getSettings(): Gio.Settings {
      const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        this.get_root()?.get_settings().get_string('schema-dir'),
        Gio.SettingsSchemaSource.get_default(),
        false
      );
      const schema = schemaSource.lookup('org.gnome.shell.extensions.snappa', false);
      return new Gio.Settings({ settings_schema: schema });
    }

    private buildUI(): void {
      // Create keyboard shortcut row
      const shortcutRow = this.createShortcutRow();
      this.add(shortcutRow);
    }

    private createShortcutRow(): Adw.ActionRow {
      // Implementation in Phase 2
    }
  }

  // GNOME Shell calls this function
  function fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const page = new Adw.PreferencesPage();
    const group = new SnappaPreferences();
    page.add(group);
    window.add(page);
  }
  ```

- **`src/types/gtk4.d.ts`**: GTK4 type definitions (basic)
- **`src/types/adwaita.d.ts`**: Libadwaita type definitions (basic)

#### Build Configuration

**Important**: `prefs.js` and `extension.js` are separate programs that run in different processes:
- `extension.js`: Runs in GNOME Shell process (uses Shell APIs)
- `prefs.js`: Runs in separate preferences process (uses GTK4/Adwaita APIs)

**esbuild.config.js modifications**:

**Current structure** (lines 11-27):
```javascript
const buildConfig = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'neutral',
    target: 'es2020',
    format: 'cjs',
    treeShaking: false,
    banner: {
        js: '// GNOME Shell Extension - Bundled with esbuild',
    },
    logLevel: 'info',
    define: {
        '__DEV__': JSON.stringify(isDev),
    },
};
```

**After: Multiple build targets**

Replace the single `buildConfig` with separate configs and build both:

```javascript
async function build() {
    try {
        // Ensure dist directory exists
        if (!fs.existsSync('dist')) {
            fs.mkdirSync('dist', { recursive: true });
        }

        // Build extension.js (GNOME Shell runtime)
        await esbuild.build({
            entryPoints: ['src/extension.ts'],
            bundle: true,
            outfile: 'dist/extension.js',
            platform: 'neutral',
            target: 'es2020',
            format: 'cjs',
            treeShaking: false,
            banner: {
                js: '// GNOME Shell Extension - Bundled with esbuild',
            },
            logLevel: 'info',
            define: {
                '__DEV__': JSON.stringify(isDev),
            },
        });

        // Build prefs.js (GTK4 preferences window)
        await esbuild.build({
            entryPoints: ['src/prefs.ts'],
            bundle: true,
            outfile: 'dist/prefs.js',
            platform: 'neutral',
            target: 'es2020',
            format: 'cjs',
            treeShaking: false,
            banner: {
                js: '// GNOME Shell Extension Preferences - Bundled with esbuild',
            },
            logLevel: 'info',
            // Note: No __DEV__ needed for prefs
        });

        // Compile GSettings schema if it exists (added in Phase 3)
        const schemaPath = 'dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml';
        if (fs.existsSync(schemaPath)) {
            console.log('Compiling GSettings schema...');
            try {
                execSync('glib-compile-schemas dist/schemas/', { stdio: 'inherit' });
                console.log('✓ Schema compiled successfully!');
            } catch (error) {
                console.error('✗ Schema compilation failed:', error.message);
            }
        }

        // Check metadata.json exists
        const metadataSource = 'dist/metadata.json';
        if (!fs.existsSync(metadataSource)) {
            console.log('Note: metadata.json should be in dist/ directory');
        }

        console.log('✓ Build complete!');
    } catch (error) {
        console.error('✗ Build failed:', error);
        process.exit(1);
    }
}

build();
```

**Key changes**:
1. Remove single `buildConfig` constant
2. Add `async function build()` wrapper
3. Build `extension.js` with existing config
4. Build `prefs.js` with similar config (no `__DEV__`)
5. Add schema compilation step (conditional)
6. Keep existing metadata.json check

**Key differences**:
- `extension.ts`: Uses `imports.gi.Shell`, `imports.ui.main`
- `prefs.ts`: Uses `import Gtk from 'gi://Gtk'`, `import Adw from 'gi://Adw'`
- Different import syntax because they run in different environments

**Output structure**:
```
dist/
├── extension.js      # Extension runtime
├── prefs.js          # Preferences UI
├── metadata.json     # Extension metadata
└── schemas/
    ├── gschemas.compiled
    └── org.gnome.shell.extensions.snappa.gschema.xml
```

### Phase 2: Keyboard Shortcut Picker Widget

**Goal**: Implement interactive keyboard shortcut selection UI

#### Tasks
- Create custom keyboard shortcut input widget
- Handle key press events for shortcut capture
- Display current shortcut with clear/reset buttons
- Validate shortcut (no conflicts, valid modifiers)

#### UI Design
```
┌─────────────────────────────────────────────────────┐
│ Snappa Preferences                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Keyboard Shortcut                                   │
│ ┌───────────────────────────────────────────────┐  │
│ │ Show Main Panel                               │  │
│ │                                                │  │
│ │ Current: Disabled                         [✕] │  │
│ │ Click to set shortcut                         │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ Press any key combination to set shortcut.         │
│ Use Backspace to clear. Default: Disabled.         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Note**: The shortcut is disabled by default to respect user's existing keybindings. Users must explicitly configure a shortcut to enable keyboard invocation.

#### Implementation Details

**Shortcut Row Widget** (`src/prefs.ts`):
```typescript
private createShortcutRow(): Adw.ActionRow {
  const row = new Adw.ActionRow({
    title: 'Show Main Panel',
    subtitle: 'Keyboard shortcut to invoke main panel for focused window'
  });

  // Shortcut display button
  const shortcutButton = new Gtk.Button({
    valign: Gtk.Align.CENTER,
    has_frame: false
  });

  // Load and display current shortcut
  this.updateShortcutLabel(shortcutButton);

  // Click to capture new shortcut
  shortcutButton.connect('clicked', () => {
    this.captureShortcut(shortcutButton);
  });

  // Clear button
  const clearButton = new Gtk.Button({
    icon_name: 'edit-clear-symbolic',
    valign: Gtk.Align.CENTER,
    has_frame: false,
    tooltip_text: 'Clear shortcut'
  });

  clearButton.connect('clicked', () => {
    this.clearShortcut(shortcutButton);
  });

  const box = new Gtk.Box({
    spacing: 6,
    valign: Gtk.Align.CENTER
  });
  box.append(shortcutButton);
  box.append(clearButton);

  row.add_suffix(box);
  return row;
}

private updateShortcutLabel(button: Gtk.Button): void {
  const shortcuts = this.settings.get_strv('show-panel-shortcut');
  if (shortcuts.length > 0) {
    button.set_label(shortcuts[0]);
  } else {
    button.set_label('Disabled');
  }
}

private captureShortcut(button: Gtk.Button): void {
  // Create modal dialog for shortcut capture
  const dialog = new Gtk.MessageDialog({
    transient_for: this.get_root() as Gtk.Window,
    modal: true,
    buttons: Gtk.ButtonsType.CANCEL,
    text: 'Press shortcut keys',
    secondary_text: 'Press Escape to cancel'
  });

  // Capture key press
  const controller = new Gtk.EventControllerKey();
  controller.connect('key-pressed', (_, keyval, keycode, state) => {
    // Parse key combination
    const mask = state & Gtk.accelerator_get_default_mod_mask();

    if (keyval === Gdk.KEY_Escape) {
      dialog.close();
      return true;
    }

    if (keyval === Gdk.KEY_BackSpace) {
      this.clearShortcut(button);
      dialog.close();
      return true;
    }

    // Valid shortcut must have modifier
    if (mask === 0) {
      return false;
    }

    // Format shortcut string
    const accelerator = Gtk.accelerator_name(keyval, mask);

    // Save to settings
    this.settings.set_strv('show-panel-shortcut', [accelerator]);
    this.updateShortcutLabel(button);

    dialog.close();
    return true;
  });

  dialog.add_controller(controller);
  dialog.present();
}

private clearShortcut(button: Gtk.Button): void {
  this.settings.set_strv('show-panel-shortcut', []);
  this.updateShortcutLabel(button);
}
```

#### Type Definitions Required
- **`src/types/gdk4.d.ts`**: GDK4 (for key event handling)
  - `Gdk.KEY_*` constants
  - `Gtk.accelerator_name()`, `Gtk.accelerator_parse()`
  - Event controller types

### Phase 3: GSettings Schema Definition

**Goal**: Define keyboard shortcut schema for GNOME Settings integration

#### Tasks
- Create GSettings schema file for keybinding configuration
- Define default keyboard shortcut binding
- Enable user customization via dedicated Preferences UI (accessible from GNOME Extensions app)

#### Files to Create
- **`schemas/org.gnome.shell.extensions.snappa.gschema.xml`**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <schemalist>
    <schema id="org.gnome.shell.extensions.snappa" path="/org/gnome/shell/extensions/snappa/">
      <key name="show-panel-shortcut" type="as">
        <default>[]</default>
        <summary>Show main panel shortcut</summary>
        <description>Keyboard shortcut to show the main panel for the focused window. Empty array means disabled (default).</description>
      </key>
    </schema>
  </schemalist>
  ```

#### Build Process Integration

**Directory Structure** (following `metadata.json` pattern):
```
dist/                                                 ← Direct management (like metadata.json)
├── extension.js                                      ← Build output (gitignored)
├── prefs.js                                          ← Build output (gitignored)
├── metadata.json                                     ← Version controlled (direct edit)
└── schemas/                                          ← Version controlled (direct edit)
    ├── org.gnome.shell.extensions.snappa.gschema.xml ← Source file
    └── gschemas.compiled                             ← Build artifact (gitignored)
```

**Build Steps**:
1. Create schema file directly in `dist/schemas/`:
   - Edit `dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml`
   - This file is version controlled (just like `dist/metadata.json`)
2. Compile schema in-place:
   ```bash
   glib-compile-schemas dist/schemas/
   ```
   - Generates: `dist/schemas/gschemas.compiled` (gitignored)
3. Both files are already in the correct location for distribution

**Note on Version Control**:
- `dist/metadata.json`: ✅ Version controlled (existing)
- `dist/schemas/*.gschema.xml`: ✅ Version controlled (new, same pattern)
- `dist/schemas/gschemas.compiled`: ❌ Gitignored (build artifact)
- `dist/*.js`: ❌ Gitignored (build outputs)

**Advantages**:
- Consistent with existing `metadata.json` approach
- No copying needed during build
- Simpler directory structure (no separate `schemas/` in project root)
- Schema file is exactly where GNOME Shell expects it

**Build Script Update**:

The schema compilation needs to be integrated into the build process. There are two approaches:

**Option 1: Add to esbuild.config.js (Recommended)**

Modify `esbuild.config.js` to compile schema after building JavaScript:

```javascript
const { execSync } = require('child_process');

async function build() {
    try {
        // ... existing build code ...

        // Compile GSettings schema if it exists
        const schemaPath = 'dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml';
        if (fs.existsSync(schemaPath)) {
            console.log('Compiling GSettings schema...');
            try {
                execSync('glib-compile-schemas dist/schemas/', { stdio: 'inherit' });
                console.log('✓ Schema compiled successfully!');
            } catch (error) {
                console.error('✗ Schema compilation failed:', error.message);
                // Don't fail the build - schema might not be needed yet
            }
        }

        console.log('✓ Build complete!');
    } catch (error) {
        console.error('✗ Build failed:', error);
        process.exit(1);
    }
}
```

**Option 2: Add npm script (Alternative)**

Add a dedicated script in `package.json`:

```json
"scripts": {
  "build": "tsc --noEmit && node esbuild.config.js && npm run compile-schema",
  "compile-schema": "test -f dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml && glib-compile-schemas dist/schemas/ || echo 'No schema to compile'"
}
```

**Recommendation**: Use Option 1 (esbuild.config.js) because:
- Schema compilation happens automatically during build
- Single command for complete build
- Consistent with current build architecture
- Error handling is clearer

### Phase 4: Extension Settings Integration

**Goal**: Load and manage keybinding settings from GSettings in the extension runtime

#### Tasks
- Add GSettings initialization to Extension class
- Load keybinding configuration from schema
- Make settings available to Controller

#### Files to Modify
- **`src/extension.ts`**:
  - Import `Gio` for GSettings access
  - Initialize `ExtensionSettings` class (new)
  - Pass settings to Controller constructor

#### Files to Create
- **`src/settings/extension-settings.ts`**:
  ```typescript
  export class ExtensionSettings {
    private settings: Gio.Settings;

    constructor(metadata: ExtensionMetadata) {
      // Get schema from extension directory
      const schemaDir = metadata.dir.get_child('schemas');
      const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        schemaDir.get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
      );
      const schema = schemaSource.lookup('org.gnome.shell.extensions.snappa', false);
      this.settings = new Gio.Settings({ settings_schema: schema });
    }

    getShowPanelShortcut(): string[] {
      return this.settings.get_strv('show-panel-shortcut');
    }

    getGSettings(): Gio.Settings {
      return this.settings;
    }
  }
  ```

### Phase 5: Keyboard Shortcut Registration

**Goal**: Register keyboard shortcut with GNOME Shell and handle invocation in extension runtime

#### Tasks
- Register keybinding using GNOME Shell's `Main.wm.addKeybinding()`
- Implement callback to handle shortcut activation
- Unregister keybinding on extension disable

#### Files to Modify
- **`src/app/controller.ts`**:
  - Import `ExtensionSettings`
  - Add `settings: ExtensionSettings` parameter to constructor
  - Store settings as instance variable
  - Register keybinding in `enable()` method
  - Unregister keybinding in `disable()` method
  - Implement `onShowPanelShortcut()` callback method

#### Implementation Details

**Keybinding Registration** (in `enable()` method):
```typescript
enable(): void {
  // Existing grab-op-begin/end signal connections...

  // Register keyboard shortcut
  const shortcut = this.settings.getShowPanelShortcut();
  Main.wm.addKeybinding(
    'show-panel-shortcut',
    this.settings.getGSettings(),  // Pass Gio.Settings object
    Meta.KeyBindingFlags.NONE,
    Shell.ActionMode.NORMAL,
    () => this.onShowPanelShortcut()
  );
}
```

**Keybinding Cleanup** (in `disable()` method):
```typescript
disable(): void {
  // Existing cleanup code...

  // Unregister keyboard shortcut
  Main.wm.removeKeybinding('show-panel-shortcut');
}
```

**Shortcut Callback Implementation**:
```typescript
private onShowPanelShortcut(): void {
  // Get currently focused window
  const focusWindow = global.display.get_focus_window();

  if (!focusWindow) {
    log('[Controller] No focused window, ignoring shortcut');
    return;
  }

  // Get current cursor position
  const cursor = this.getCursorPosition();

  // Store window reference (similar to drag behavior)
  this.currentWindow = focusWindow;
  this.lastDraggedWindow = focusWindow;

  // Show main panel at cursor position
  this.mainPanel.show(cursor, focusWindow);
}
```

### Phase 6: Type Definitions

**Goal**: Add TypeScript type definitions for GNOME Shell keybinding APIs and GTK4

#### Files to Modify
- **`src/types/gnome-shell-42.d.ts`**:
  ```typescript
  declare namespace Shell {
    enum ActionMode {
      NONE = 0,
      NORMAL = 1,
      OVERVIEW = 2,
      LOCK_SCREEN = 4,
      UNLOCK_SCREEN = 8,
      LOGIN_SCREEN = 16,
      SYSTEM_MODAL = 32,
      LOOKING_GLASS = 64,
      POPUP = 128,
      ALL = 0xffffffff
    }
  }

  interface WM {
    addKeybinding(
      name: string,
      settings: Gio.Settings,
      flags: Meta.KeyBindingFlags,
      modes: Shell.ActionMode,
      handler: () => void
    ): number;

    removeKeybinding(name: string): void;
  }

  interface Main {
    wm: WM;
    // ... existing Main interface definitions
  }

  declare namespace Meta {
    enum KeyBindingFlags {
      NONE = 0,
      PER_WINDOW = 1,
      BUILTIN = 2,
      IS_REVERSED = 4,
      NON_MASKABLE = 8,
      IGNORE_AUTOREPEAT = 16
    }
  }
  ```

### Phase 7: Schema Compilation and Distribution

**Goal**: Ensure GSettings schema is properly compiled and distributed with both extension and preferences

#### Build Process Updates
- Add schema compilation to build script (if needed)
- Verify `dist/schemas/` contains compiled schema
- Test schema installation in extension directory

#### Verification Steps
```bash
# Compile schema
glib-compile-schemas dist/schemas/

# Verify compiled schema exists
ls -l dist/schemas/gschemas.compiled

# Test schema loading (after installation)
gsettings list-schemas | grep snappa
gsettings list-keys org.gnome.shell.extensions.snappa
gsettings get org.gnome.shell.extensions.snappa show-panel-shortcut
```

### Phase 8: Settings Button in Main Panel Footer

**Goal**: Add settings icon to main panel footer for quick access to preferences

#### Tasks
- Add small settings icon button to footer
- Position icon next to "Powered by Snappa" text
- Open preferences window when clicked
- Close main panel after opening preferences

#### UI Design

**Before**:
```
┌─────────────────────────────────┐
│  [Layout buttons...]            │
│                                 │
│  Powered by Snappa              │
└─────────────────────────────────┘
```

**After**:
```
┌─────────────────────────────────┐
│  [Layout buttons...]            │
│                                 │
│  Powered by Snappa          ⚙️  │ ← Small icon on the right
└─────────────────────────────────┘
```

#### Implementation Details

**Update `createFooter()` in `src/app/main-panel/renderer.ts`**:

```typescript
export function createFooter(onSettingsClick: () => void): St.BoxLayout {
  // Change from St.Label to St.BoxLayout to hold both text and icon
  const footerBox = new St.BoxLayout({
    style: `
      margin-top: ${FOOTER_MARGIN_TOP}px;
    `,
    vertical: false,
    x_align: Clutter.ActorAlign.CENTER,
  });

  // Text label
  const label = new St.Label({
    text: 'Powered by Snappa',
    style: `
      font-size: 12px;
      color: ${FOOTER_TEXT_COLOR};
    `,
  });

  // Settings icon button
  const settingsButton = new St.Button({
    style_class: 'snappa-settings-icon',
    style: `
      margin-left: 8px;
      padding: 2px 4px;
      border-radius: 4px;
    `,
    track_hover: true,
  });

  const icon = new St.Icon({
    icon_name: 'preferences-system-symbolic',  // GNOME standard settings icon
    icon_size: 14,
    style: `color: ${FOOTER_TEXT_COLOR};`,
  });

  settingsButton.set_child(icon);

  settingsButton.connect('clicked', () => {
    onSettingsClick();
    return Clutter.EVENT_STOP;
  });

  // Hover effect
  settingsButton.connect('enter-event', () => {
    settingsButton.style = `
      margin-left: 8px;
      padding: 2px 4px;
      border-radius: 4px;
      background-color: rgba(255, 255, 255, 0.1);
    `;
  });

  settingsButton.connect('leave-event', () => {
    settingsButton.style = `
      margin-left: 8px;
      padding: 2px 4px;
      border-radius: 4px;
    `;
  });

  footerBox.add_child(label);
  footerBox.add_child(settingsButton);

  return footerBox;
}
```

**Update `MainPanel.show()` in `src/app/main-panel/index.ts`**:

```typescript
show(cursor: Position, window: Meta.Window | null = null): void {
  // ... existing code ...

  // Create footer with settings button
  const footer = createFooter(() => {
    this.openPreferences();
    this.hide();  // Close panel after opening preferences
  });

  this.container.add_child(footer);

  // ... existing code ...
}

private openPreferences(): void {
  const GLib = imports.gi.GLib;

  try {
    // Use gnome-extensions command to open preferences
    GLib.spawn_command_line_async(
      'gnome-extensions prefs snappa@x7c1.github.io'
    );
    log('[MainPanel] Opening preferences window');
  } catch (e) {
    log(`[MainPanel] Failed to open preferences: ${e}`);
  }
}
```

#### Alternative: Using ExtensionUtils (if available in GNOME Shell 42)

```typescript
// Check if available
const ExtensionUtils = imports.misc.extensionUtils;

private openPreferences(): void {
  try {
    ExtensionUtils.openPrefs();
  } catch (e) {
    // Fallback to gnome-extensions command
    const GLib = imports.gi.GLib;
    GLib.spawn_command_line_async(
      'gnome-extensions prefs snappa@x7c1.github.io'
    );
  }
}
```

#### Files to Modify

- `src/app/main-panel/renderer.ts`:
  - Change `createFooter()` return type: `St.Label` → `St.BoxLayout`
  - Add `onSettingsClick` callback parameter
  - Create footer box with label and icon button
  - **Note**: This is a breaking change to the existing `createFooter()` function

- `src/app/main-panel/index.ts`:
  - Add `openPreferences()` method
  - Update `show()` to pass callback to `createFooter()` (currently called without arguments at line 179)

#### Visual Design

**Icon specifications**:
- Icon: `preferences-system-symbolic` (standard GNOME settings icon)
- Size: 14px (small and unobtrusive)
- Color: Same as footer text (`FOOTER_TEXT_COLOR`)
- Hover: Slight background highlight `rgba(255, 255, 255, 0.1)`
- Position: Right side of footer, 8px margin from text

**Benefits**:
- Quick access to settings without opening Extensions app
- Consistent with other GNOME applications
- Non-intrusive (small icon, only in footer)
- Clear affordance (standard settings icon)

### Phase 9: User Documentation

**Goal**: Document keyboard shortcut feature and preferences UI for users

#### Files to Create/Modify
- **`README.md`**: Add keyboard shortcut documentation
  - Feature: "Optional keyboard shortcut for quick access"
  - Default: "Disabled by default (configure in Preferences)"
  - How to configure:
    - "Click ⚙️ icon in main panel footer, OR"
    - "Right-click extension in GNOME Extensions app → Preferences"
  - How to use: "After configuring, press your chosen shortcut to open main panel"
  - Interactive keyboard shortcut picker in preferences window

### Architecture Overview

**Component Integration**:
```
Extension
  → ExtensionSettings (load schema)
  → Controller (register keybinding)
    → Main.wm.addKeybinding()
    → onShowPanelShortcut()
      → get focused window
      → get cursor position
      → mainPanel.show()
```

**Comparison with D-Bus Approach**:

| Aspect | GNOME Keybinding (Recommended) | D-Bus Approach |
|--------|-------------------------------|----------------|
| User Configuration | GNOME Settings GUI | Command line + shell script |
| Integration | Native GNOME Shell | External interface |
| Setup Complexity | Schema definition only | D-Bus interface + command binding |
| Discoverability | Listed in Settings | Requires documentation |
| Maintenance | GNOME Shell handles it | Manual shell script setup |

**Why GNOME Keybinding is Better**:
- Users can change shortcuts without editing configs
- Appears in standard GNOME Settings UI alongside other shortcuts
- No external dependencies (D-Bus registration, gdbus commands)
- Follows GNOME extension best practices
- Automatic conflict detection with other shortcuts

## File Modification Summary

**New Files (6)**:
- `src/prefs.ts` - Preferences UI entry point with keyboard shortcut picker
- `src/types/gtk4.d.ts` - GTK4 type definitions
- `src/types/adwaita.d.ts` - Libadwaita type definitions
- `src/types/gdk4.d.ts` - GDK4 type definitions (key events)
- `dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml` - GSettings schema definition
- `src/settings/extension-settings.ts` - Settings manager class

**Modified Files (7)**:
- `src/extension.ts` - Initialize settings, pass to Controller constructor
- `src/app/controller.ts` - Accept settings in constructor, register/unregister keybinding, implement callback
- `src/types/gnome-shell-42.d.ts` - Add keybinding API type definitions (Shell.ActionMode, WM interface, Meta.KeyBindingFlags)
- `esbuild.config.js` - Add second build target for `prefs.ts` → `dist/prefs.js`
- `.gitignore` - Allow `dist/schemas/` but ignore `gschemas.compiled`
- `src/app/main-panel/renderer.ts` - Update `createFooter()` signature and implementation (breaking change)
- `src/app/main-panel/index.ts` - Add `openPreferences()` method, update `createFooter()` call

**Documentation Files (1)**:
- `README.md` - Add keyboard shortcut and preferences UI documentation

**Total**: 7 new files (including schema in dist/schemas/), 7 modified files

## Testing Plan

### Schema Validation
- Compile schema successfully
- Verify schema appears in `gsettings list-schemas`
- Read default shortcut value from schema
- Modify shortcut via `gsettings set` command
- Verify modified shortcut persists after reload

### Functional Testing

#### Basic Invocation (After Configuration)
- Open preferences and set shortcut to `Super+Space`
- Focus any window (e.g., Firefox)
- Press configured shortcut (`Super+Space`)
- **Expected**: Main panel appears at cursor position
- Select a layout
- **Expected**: Window applies layout correctly

#### Default State (No Shortcut)
- Install extension (first time)
- Press any common shortcut combinations
- **Expected**: Extension does not respond (shortcut disabled by default)
- Open preferences
- **Expected**: Shows "Disabled" as current shortcut

#### Window Focus Handling
- No window focused (desktop/overview)
- Press shortcut
- **Expected**: Nothing happens (logged message)
- Focus window
- Press shortcut
- **Expected**: Main panel appears

#### Integration with Existing Features
- Open main panel via shortcut
- **Expected**: Layout history highlighting works
- Select layout
- Reopen panel via drag
- **Expected**: Same layout highlighted
- Reopen panel via shortcut
- **Expected**: Same layout highlighted

#### Shortcut Customization via Preferences UI

**Method 1: From Extensions App**
- Open GNOME Extensions app
- Find "Snappa" extension
- Click settings/gear icon (or right-click → Preferences)
- **Expected**: Preferences window opens showing "Disabled"

**Method 2: From Main Panel (Quick Access)**
- Drag window to edge to show main panel
- Click ⚙️ icon in footer
- **Expected**: Preferences window opens, main panel closes
- Click on shortcut button showing "Disabled"
- **Expected**: Modal dialog appears: "Press shortcut keys"
- Press `Super+Space`
- **Expected**: Shortcut updates to "Super + Space"
- Close preferences
- Test shortcut (`Super+Space`)
- **Expected**: Opens panel
- Reopen preferences
- Click on shortcut button showing "Super + Space"
- Press `Ctrl+Alt+S`
- **Expected**: Shortcut updates to "Ctrl + Alt + S"
- Test old shortcut (`Super+Space`)
- **Expected**: Does not work
- Test new shortcut (`Ctrl+Alt+S`)
- **Expected**: Opens panel

#### Preferences UI Interaction
- Open preferences window
- **Expected**: Current shortcut displayed
- Click clear button (✕)
- **Expected**: Shortcut changes to "Disabled"
- Try to invoke panel with any key
- **Expected**: Nothing happens (shortcut disabled)
- Open preferences again
- Set new shortcut
- **Expected**: Shortcut works immediately (no extension restart needed)

#### Multiple Windows
- Open two windows (Firefox, Terminal)
- Focus Firefox, press shortcut
- **Expected**: Panel shows with Firefox's layout history
- Select layout, close panel
- Focus Terminal, press shortcut
- **Expected**: Panel shows with Terminal's layout history

### Edge Cases
- Press shortcut while panel already open
- **Expected**: Panel remains open (or closes then reopens)
- Press shortcut with maximized window
- **Expected**: Panel opens, layout application unmaximizes window
- Press shortcut rapidly multiple times
- **Expected**: No crashes, panel responds smoothly

### Quality Checks
- Run `npm run build` - Must succeed
- Run `npm run check` - Must pass
- Run `npm run test:run` - Must pass
- Verify schema compiles without warnings
- Test shortcut doesn't interfere with system shortcuts

## Implementation Timeline

### Phase 1: Preferences UI Foundation (Estimated: 3 points)
- Set up GTK4/Libadwaita infrastructure
- Create `prefs.ts` entry point with basic structure
- Create basic type definitions:
  - `src/types/gtk4.d.ts` - GTK4 types (Button, Label, Box, etc.)
  - `src/types/adwaita.d.ts` - Libadwaita types (PreferencesWindow, PreferencesPage, PreferencesGroup, ActionRow)
  - `src/types/gdk4.d.ts` - GDK4 types (KEY_* constants, event controller types)
- **Update esbuild.config.js to build both `extension.js` and `prefs.js`**
  - Replace single `buildConfig` with `async function build()`
  - Add first build target: `src/extension.ts` → `dist/extension.js` (existing config)
  - Add second build target: `src/prefs.ts` → `dist/prefs.js` (new config, no `__DEV__`)
  - Add `execSync` import: `const { execSync } = require('child_process');`
  - Ensure both outputs go to `dist/` directory
  - Verify both files are generated on `npm run build`
- Test preferences window opens from Extensions app (right-click → Preferences)

### Phase 2: Keyboard Shortcut Picker (Estimated: 3 points)
- Implement shortcut display row with button
- Create modal dialog for key capture
- Handle key press events and modifier detection
- Implement shortcut validation (require modifiers)
- Add clear/reset functionality
- Test shortcut capture and display

### Phase 3: GSettings Schema (Estimated: 1 point)
- Create `dist/schemas/` directory
- Create schema XML file directly: `dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml`
  - Following the same pattern as `dist/metadata.json` (version controlled)
- Define default shortcut binding (empty array)
- Add schema compilation to build process
  - Update build script to run `glib-compile-schemas dist/schemas/`
  - Generates `dist/schemas/gschemas.compiled` (gitignored)
- **Update `.gitignore`**:
  ```diff
  # Ignore everything in dist/ except metadata.json
  dist/*
  !dist/metadata.json
  +!dist/schemas/
  +dist/schemas/gschemas.compiled
  ```
  - Allow `dist/schemas/` directory: `!dist/schemas/`
  - Ignore compiled schema: `dist/schemas/gschemas.compiled`

### Phase 4: Settings Integration (Estimated: 1 point)
- Implement `ExtensionSettings` class with methods:
  - `getShowPanelShortcut()`: Returns keyboard shortcut array
  - `getGSettings()`: Returns raw Gio.Settings object (needed for keybinding registration)
- Integrate settings loading in Extension class
- Update Controller constructor to accept `ExtensionSettings` parameter
- Pass settings to Controller
- Connect preferences to schema

### Phase 5: Keybinding Registration (Estimated: 2 points)
- Register keybinding in Controller
- Implement shortcut callback
- Add cleanup in disable method
- Listen for settings changes (real-time shortcut updates)
- Test basic invocation

### Phase 6: Type Definitions (Estimated: 2 points)
- Add Shell.ActionMode enum
- Add WM interface with keybinding methods
- Add Meta.KeyBindingFlags enum
- Complete GTK4/Adwaita/GDK4 type definitions
- Verify TypeScript compilation for both extension and prefs

### Phase 7: Schema Distribution (Estimated: 1 point)
- Verify schema compilation in build (`npm run build`)
  - Check `dist/schemas/gschemas.compiled` is generated
  - Check `dist/schemas/` contains both `.xml` and `.compiled`
- Ensure schema accessible to both extension and prefs
- Test schema loading in preferences window
- Validate with gsettings commands:
  ```bash
  # After installing extension
  gsettings list-schemas | grep snappa
  gsettings list-keys org.gnome.shell.extensions.snappa
  gsettings get org.gnome.shell.extensions.snappa show-panel-shortcut
  ```
- Verify `.gitignore` correctly handles version control
  - `dist/schemas/*.gschema.xml` should be committed (like metadata.json)
  - `dist/schemas/gschemas.compiled` should not be committed (build artifact)

### Phase 8: Settings Button in Main Panel Footer (Estimated: 1 point)
- Update `createFooter()` in `src/app/main-panel/renderer.ts`:
  - Change signature to accept `onSettingsClick` callback
  - Change return type from `St.Label` to `St.BoxLayout`
  - This is a breaking change - update all call sites
- Add `openPreferences()` method to `MainPanel` class
- Update `MainPanel.show()` to pass callback when calling `createFooter()`
- Test settings icon hover effect and preferences window opening

### Phase 9: Documentation (Estimated: 1 point)
- Update README with usage instructions
- Document preferences UI access
- Add screenshots of preferences window
- Document customization workflow

### Phase 10: Testing & Refinement (Estimated: 2 points)
- Test preferences window opens correctly
  - From Extensions app (⚙️ icon)
  - From main panel footer (⚙️ icon)
  - Via command line (`gnome-extensions prefs`)
- Test shortcut capture and validation
- Test real-time shortcut updates
- Test settings icon hover effect
- Execute all functional test scenarios
- Fix any issues discovered
- Performance verification
- Final quality checks

**Total Estimated Effort**: 17 points

**Note on Breaking Changes**:
- Phase 8 introduces a breaking change to `createFooter()` function signature
- Current code: `createFooter()` returns `St.Label`
- New code: `createFooter(onSettingsClick: () => void)` returns `St.BoxLayout`
- Must update call site in `MainPanel.show()` (currently line 179: `const footer = createFooter();`)

## Success Criteria

- Users can invoke main panel using keyboard shortcut (when configured)
- Shortcut is disabled by default (no keybinding conflicts on installation)
- Shortcut is configurable via preferences UI
- Main panel behavior identical to drag-triggered panel
- Layout history works correctly with keyboard invocation
- Schema compiles and loads successfully
- All existing tests pass
- Extension respects user's keybinding choices (opt-in feature)

## Risks & Mitigations

### Risk 1: Shortcut Conflicts
- **Risk**: User-configured shortcut might conflict with existing shortcuts
- **Mitigation**:
  - No default shortcut (user must explicitly configure)
  - GNOME Shell may show warnings for conflicts
  - User has full control over their keybindings

### Risk 2: Schema Loading Failures
- **Risk**: Schema might not load if not properly compiled/installed
- **Mitigation**: Add schema validation to build process, log clear error messages

### Risk 5: GTK4/Libadwaita Compatibility
- **Risk**: GNOME Shell 42 may have specific GTK/Adwaita version requirements
- **Mitigation**: Check GNOME 42 documentation for compatible versions, test on target platform

### Risk 6: Import Syntax Differences
- **Risk**: `extension.ts` and `prefs.ts` use different import syntax, may cause confusion
- **Mitigation**:
  - Document clearly: extension uses `imports.gi.*`, prefs uses `import * from 'gi://*'`
  - Add comments in code explaining the difference
  - This is standard GNOME extension architecture (not a bug)

### Risk 3: Focus Window Edge Cases
- **Risk**: Some windows might not report focus correctly
- **Mitigation**: Check for null window and log gracefully, similar to WM_CLASS handling

### Risk 4: Keyboard vs. Mouse Workflow Differences
- **Risk**: Keyboard-invoked panel might behave differently than drag-invoked
- **Mitigation**: Reuse exact same code path (mainPanel.show()), only entry point differs

## Future Enhancements

### Multiple Shortcuts
- Assign different shortcuts for different layout categories
- Example: `<Super>1` for Halves, `<Super>2` for Thirds, etc.

### Quick Layout Application
- Skip panel, apply last-used layout directly
- Example: User configures second shortcut to apply most recent layout without showing panel
- Note: Would also be disabled by default, requiring explicit user configuration

### Layout Selection via Keyboard
- Navigate panel using arrow keys
- Select layout with Enter key
- Close panel with Escape

### Workspace-Aware Shortcuts
- Different default layouts per workspace
- Remember layout preferences per workspace

### Command Palette Integration
- Integrate with GNOME Shell's built-in command palette (if available)
- Type layout names to filter and apply

## Notes

### Why Preferences UI Instead of GNOME Settings?

**Initial Plan**: Use GNOME Settings > Keyboard > Shortcuts

**Updated Plan**: Create dedicated preferences window

**Reasons**:
1. **Better User Experience**: Extension-specific preferences are easier to find in Extensions app
2. **More Control**: Can add additional settings in the future (layout options, appearance, etc.)
3. **Visual Feedback**: Show current shortcut state directly in extension preferences
4. **Self-Contained**: No dependency on system settings organization
5. **GNOME Extension Best Practice**: Most extensions provide their own preferences UI

**Comparison**:
| Aspect | Preferences UI | GNOME Settings |
|--------|---------------|----------------|
| Access | Right-click in Extensions app | Navigate to Settings > Keyboard |
| Discoverability | High (next to extension) | Medium (in system settings) |
| Customization | Full control over UI | Limited to key picker |
| Future Features | Easy to add more settings | Only keyboard shortcuts |

### Why Not D-Bus?

The D-Bus approach (like the reloader) is suitable for development tools that need external triggering (e.g., from file watchers, build scripts). However, for user-facing keyboard shortcuts, GNOME's native keybinding system with preferences UI is superior because:

1. **User Control**: Users can customize shortcuts through visual UI
2. **Discoverability**: Preferences accessible from Extensions app
3. **Visual Feedback**: See current shortcut at a glance
4. **Simplicity**: No external scripts or gdbus commands needed
5. **Best Practices**: This is how GNOME extensions typically implement user-configurable shortcuts

The D-Bus interface should remain for the reloader feature (development use case) while keyboard shortcuts use preferences UI + native keybinding system (user feature).

### Schema Installation

The compiled schema must be present in the extension directory:
```
~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/
  ├── extension.js
  ├── metadata.json
  └── schemas/
      ├── gschemas.compiled
      └── org.gnome.shell.extensions.snappa.gschema.xml
```

Users don't need to manually install the schema - GNOME Shell loads it automatically from the extension directory when the extension is enabled.
