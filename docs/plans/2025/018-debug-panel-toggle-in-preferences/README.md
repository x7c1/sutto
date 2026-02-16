# Debug Panel Toggle in Preferences

Status: Completed

## Overview

Add a toggle setting to enable/disable the debug panel in the preferences UI. The toggle will only appear when `__DEV__ === true` (debug builds).

## Current Situation

### Existing Debug Panel Implementation

The extension already has a fully implemented debug panel:

- **Location**: `src/app/debug-panel/`
- **Main Components**:
  - `index.ts`: `DebugPanel` class (480 lines) - creates 300px wide interactive panel
  - `config.ts`: Configuration management with `isDebugMode()` function
  - `test-layouts.ts`: Nine test layout groups (A-I)

- **Current Behavior**:
  - Debug panel always appears when `__DEV__ === true` (debug builds)
  - Never appears when `__DEV__ === false` (release builds)
  - No user control over visibility in debug builds

### Debug Panel Features

The debug panel displays:
- **Category Structure**: Total categories, displays per category, buttons per display
- **Display Elements**: Toggles for footer, miniature backgrounds/borders, button borders
- **Debug Visualizations**: Spacing guides and size labels
- **Test Layout Groups**: Nine test groups (A-I) with various window arrangements

### Debug Panel Integration

- **File**: `src/app/main-panel/debug-integration.ts` - `MainPanelDebugIntegration` class
- **Initialization**: `initialize()` method checks `isDebugMode()` and creates panel if true
- **Positioning**: Appears 20px to the right of main panel
- **Configuration**: Persisted in `~/.local/share/gnome-shell/extensions/[uuid]/debug-config.json`

### Debug Mode Detection

- **Global Constant**: `__DEV__` (boolean) defined in `src/types/build-mode.d.ts`
- **Set By**: esbuild during build process
  - Development build: `npm run build` → `__DEV__ = true`
  - Release build: `npm run build:release` → `__DEV__ = false`
- **Check Function**: `isDebugMode()` in `src/app/debug-panel/config.ts` returns `__DEV__`

### Existing Settings System

The extension uses GNOME's GSettings for configuration:

- **Schema**: `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml`
- **Schema ID**: `org.gnome.shell.extensions.sutto`
- **Current Settings**:
  - `show-panel-shortcut`: Keyboard shortcut to show main panel (default: disabled)
  - `hide-panel-shortcut`: Keyboard shortcut to hide main panel (default: Escape)

- **Settings Manager**: `src/settings/extension-settings.ts` - `ExtensionSettings` class
  - Provides typed access: `getShowPanelShortcut()`, `getHidePanelShortcut()`, `getGSettings()`

- **Preferences UI**: `src/settings/preferences.ts` - `Preferences` class
  - Uses GTK4 with Adwaita (`Adw.PreferencesPage`, `Adw.PreferencesGroup`, `Adw.ActionRow`)
  - Currently only shows keyboard shortcut configuration
  - Uses `Adw.SwitchRow` pattern for toggle settings

## Problem

Developers working on the extension may want to disable the debug panel temporarily without switching to a release build. Currently, there's no way to control debug panel visibility in debug builds - it's always enabled.

## Requirements

- Add a toggle setting for debug panel visibility
- The toggle should ONLY appear in preferences UI when `__DEV__ === true` (debug builds)
- Use `Adw.SwitchRow` for the UI (consistent with GNOME design patterns)
- Default value: `true` (enabled by default in debug builds, maintaining current behavior)
- When disabled, debug panel should not appear even in debug builds
- When enabled, debug panel appears as it currently does
- Setting must persist across sessions using GSettings

## Implementation Plan

### Step 0: Fix esbuild Configuration

**File**: `esbuild.config.js`

**Problem**: The prefs.js build configuration (line 37-49) does not include the `define` section, so `__DEV__` is not replaced in the preferences bundle. This will cause errors when using `__DEV__` in preferences.ts.

**Solution**: Add `define` section to prefs.js build configuration (line 48, after `logLevel: 'info',`):

```javascript
define: {
    '__DEV__': JSON.stringify(isDev),
},
```

**Complete prefs.js build configuration**:
```javascript
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
    define: {
        '__DEV__': JSON.stringify(isDev),
    },
});
```

**Why**:
- Without this, `__DEV__` in preferences.ts will be undefined
- Both extension.js and prefs.js need the same build-time constants
- This ensures debug settings group only appears in debug builds

### Step 1: Add GSettings Schema Key

**File**: `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml`

Add new boolean key after the `hide-panel-shortcut` key (line 13):

```xml
<key name="debug-panel-enabled" type="b">
  <default>true</default>
  <summary>Enable debug panel in debug builds</summary>
  <description>Controls whether the debug panel is shown when in debug mode (development builds). This setting has no effect in release builds.</description>
</key>
```

**Why**:
- GSettings is the standard GNOME configuration system
- Boolean type (`b`) for simple on/off toggle
- Default `true` maintains current behavior (no breaking changes)
- Schema is automatically compiled by esbuild during build

### Step 2: Add Getter Method to ExtensionSettings

**File**: `src/settings/extension-settings.ts`

Add new method after `getHidePanelShortcut()` (line 44):

```typescript
/**
 * Get whether debug panel is enabled
 * @returns Boolean indicating if debug panel should be shown in debug mode
 */
getDebugPanelEnabled(): boolean {
  return this.settings.get_boolean('debug-panel-enabled');
}
```

**Why**:
- Provides type-safe access to the setting
- Consistent with existing pattern (`getShowPanelShortcut()`, `getHidePanelShortcut()`)
- Encapsulates GSettings API

### Step 3: Add Debug Settings Group to Preferences UI

**File**: `src/settings/preferences.ts`

Add conditional debug settings group in `buildPreferencesUI()` function after line 135:

```typescript
// Debug settings (only visible in debug builds)
if (__DEV__) {
  const debugGroup = new Adw.PreferencesGroup({
    title: 'Debug Settings',
  });

  const debugRow = new Adw.SwitchRow({
    title: 'Show Debug Panel',
    subtitle: 'Display debug panel when in debug mode',
  });

  // Bind switch to settings
  settings.bind(
    'debug-panel-enabled',
    debugRow,
    'active',
    Gio.SettingsBindFlags.DEFAULT
  );

  debugGroup.add(debugRow);
  page.add(debugGroup);
}
```

**Why**:
- `__DEV__` check ensures group only appears in debug builds
- `Adw.SwitchRow` matches GNOME HIG design patterns
- `settings.bind()` provides automatic two-way binding (no manual event handlers needed)
- Consistent with existing preferences UI structure

**Note**: Use `__DEV__` directly (build-time constant replaced by esbuild). No import needed.

### Step 4: Update MainPanelDebugIntegration

**File**: `src/app/main-panel/debug-integration.ts`

Changes:

1. Add import:
```typescript
import type { ExtensionSettings } from '../../settings/extension-settings';
```

2. Add private field to store settings:
```typescript
private extensionSettings: ExtensionSettings | null = null;
```

3. Update `initialize()` method to store settings (line 26):
```typescript
initialize(
  autoHide: MainPanelAutoHide,
  onConfigChanged: () => void,
  extensionSettings: ExtensionSettings
): void {
  if (!isDebugMode()) {
    log('[MainPanelDebugIntegration] Debug mode is disabled');
    return;
  }

  log('[MainPanelDebugIntegration] Initializing debug panel integration');
  this.extensionSettings = extensionSettings;

  loadDebugConfig();
  this.debugPanel = new DebugPanel();

  // Setup debug panel callbacks
  this.debugPanel.setOnConfigChanged(() => {
    onConfigChanged();
  });

  this.debugPanel.setOnEnter(() => {
    autoHide.setDebugPanelHovered(true, AUTO_HIDE_DELAY_MS);
  });

  this.debugPanel.setOnLeave(() => {
    autoHide.setDebugPanelHovered(false, AUTO_HIDE_DELAY_MS);
  });
}
```

4. Update `showRelativeTo()` method to check settings each time:
```typescript
showRelativeTo(position: Position, size: Size): void {
  if (!this.debugPanel || !this.extensionSettings) {
    return;
  }

  // Check setting value each time main panel is shown
  const debugPanelEnabled = this.extensionSettings.getDebugPanelEnabled();

  if (debugPanelEnabled) {
    this.debugPanel.showRelativeTo(position, size);
  }
}
```

**Why**:
- Store `ExtensionSettings` reference to check setting value dynamically
- In debug mode, always create debug panel during initialization
- Check `getDebugPanelEnabled()` each time `showRelativeTo()` is called
- This allows settings to take effect immediately when main panel is reopened (no extension reload required)

### Step 5: Update MainPanel Constructor

**File**: `src/app/main-panel/index.ts`

Changes:

1. Add import at the top:
```typescript
import { ExtensionSettings } from '../settings/extension-settings';
```

2. Update constructor (line 51-68):
```typescript
constructor(metadata: ExtensionMetadata) {
  this.metadata = metadata;

  // Setup auto-hide callback
  this.autoHide.setOnHide(() => {
    this.hide();
  });

  // Load extension settings for debug panel
  const extensionSettings = new ExtensionSettings(metadata);

  // Initialize debug integration
  this.debugIntegration.initialize(this.autoHide, () => {
    // Refresh panel when debug config changes
    if (this.container) {
      const cursor = this.state.getOriginalCursor();
      const window = this.state.getCurrentWindow();
      this.show(cursor, window);
    }
  }, extensionSettings);

  // ... rest of constructor unchanged
}
```

**Why**:
- Create `ExtensionSettings` instance to pass to debug integration
- Maintains separation of concerns (MainPanel doesn't directly access settings)

## Files to Modify

- `esbuild.config.js` - Add `define` section to prefs.js build config
- `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml` - Add new setting key
- `src/settings/extension-settings.ts` - Add getter method
- `src/settings/preferences.ts` - Add debug settings group UI
- `src/app/main-panel/debug-integration.ts` - Check setting value
- `src/app/main-panel/index.ts` - Pass ExtensionSettings instance

## Testing Strategy

### Build & Verification
```bash
npm run build && npm run check && npm run test:run
```

### Manual Testing Scenarios

#### Test 1: Debug Build - Default Behavior
- Build: `npm run build`
- Expected: Debug panel appears (default enabled)
- Open preferences: "Debug Settings" group appears with "Show Debug Panel" switch ON

#### Test 2: Debug Build - Disable Panel
- Open preferences
- Toggle "Show Debug Panel" switch OFF
- Setting is saved to GSettings
- Close main panel (if open) and reopen it
- Expected: Debug panel does not appear (setting takes effect immediately)

#### Test 3: Debug Build - Re-enable Panel
- Open preferences
- Toggle "Show Debug Panel" switch ON
- Setting is saved to GSettings
- Close main panel (if open) and reopen it
- Expected: Debug panel appears
- Verify debug panel functionality works correctly

#### Test 4: Release Build
- Build: `BUILD_MODE=release npm run build:release`
- Expected: Debug panel never appears
- Open preferences: "Debug Settings" group does NOT appear
- GSettings value ignored in release builds

#### Test 5: Settings Persistence
- Enable/disable debug panel
- Close extension completely
- Reopen extension
- Expected: Setting persists (GSettings dconf storage)

## Timeline Estimate

- esbuild.config.js fix: 1 point
- Schema modification: 1 point
- ExtensionSettings update: 1 point
- Preferences UI update: 2 points
- Debug integration update: 2 points
- MainPanel constructor update: 1 point
- Testing and verification: 2 points

**Total**: 10 points

## Technical Considerations

### Build-Time vs Runtime Configuration

- `__DEV__`: Build-time constant (replaced by esbuild)
- `debug-panel-enabled`: Runtime user preference (stored in GSettings)
- Logic: `if (__DEV__ && settings.getDebugPanelEnabled())`

### Schema Compilation

The GSettings schema is automatically compiled during build:
- `esbuild.config.js` runs `glib-compile-schemas dist/schemas/`
- Creates `gschemas.compiled` binary file
- No manual compilation needed

### Settings Binding

- `settings.bind()` provides automatic two-way binding
- Changes in UI automatically update GSettings
- Changes in GSettings automatically update UI
- No manual event handlers required

### Backward Compatibility

- Default value `true` maintains current behavior
- Existing debug builds continue to show debug panel by default
- Users can opt-out if desired

### Dynamic Settings Changes

Settings are checked each time the main panel is opened:
- `MainPanelDebugIntegration` holds a reference to `ExtensionSettings`
- `showRelativeTo()` checks the current setting value before displaying the debug panel
- Changes to the `debug-panel-enabled` setting take effect when the main panel is reopened (no extension reload required)
- This provides immediate feedback without the complexity of monitoring GSettings change signals

## Success Criteria

- Debug panel toggle appears in preferences UI (debug builds only)
- Toggle correctly enables/disables debug panel
- Setting persists across extension reloads
- Release builds unaffected (no UI, no panel)
- All tests pass (`npm run build && npm run check && npm run test:run`)
- No breaking changes to existing functionality
