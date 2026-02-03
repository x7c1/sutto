# Migration Plan: GNOME Shell 42 → 46 for Ubuntu 24.04

## Overview

Migrate the Snappa GNOME Shell extension from **GNOME Shell 42** (Ubuntu 22.04) to **GNOME Shell 46** (Ubuntu 24.04). This is a major migration requiring comprehensive refactoring due to breaking changes introduced in GNOME Shell 45.

**Current Environment:** Ubuntu 22.04 LTS + GNOME Shell 42
**Target Environment:** Ubuntu 24.04 LTS + GNOME Shell 46

## Background

### Current State

- Extension built exclusively for GNOME Shell 42 (`metadata.json` specifies `"shell-version": ["42"]`)
- Uses legacy `imports` API throughout codebase (40 occurrences across 16 files)
- Built with CommonJS module format (`format: 'cjs'` in esbuild)
- Custom type definitions for GNOME Shell 42 (`src/types/gnome-shell-42.d.ts`)
- TypeScript targeting ES2020 for SpiderMonkey 91

### Why Migration is Necessary

GNOME Shell 45 introduced a fundamental breaking change: the mandatory migration from the legacy `imports` API to **ECMAScript Modules (ESM)**. This change makes all GNOME Shell 42 extensions incompatible with GNOME Shell 45+.

**Key Breaking Changes:**
- Legacy `imports.*` API removed → ESM `import` statements required
- Extension class structure changed → Must extend base `Extension` class
- Preferences structure changed → Must extend `ExtensionPreferences` class
- Module format changed → CommonJS → ESM
- `extensionUtils` deprecated → Built-in Extension methods

## Impact Analysis

### Code Impact Statistics

| Import Type | Occurrences | Affected Files |
|------------|-------------|----------------|
| `imports.gi.*` (GI libraries) | 32 | 14 files |
| `imports.ui.*` (Shell UI) | 6 | 6 files |
| `imports.mainloop.*` (deprecated) | 2 | 1 file |
| **Total** | **40** | **16 files** |

### Most Used Libraries

- **St** (Shell Toolkit) - 8 occurrences
- **Main** (UI) - 6 occurrences
- **Gio** - 5 occurrences
- **Meta** - 4 occurrences
- **GLib** - 4 occurrences

### Critical Files Requiring Changes

**Entry Points:**
- `src/extension.ts` - Main extension entry point (class structure change required)
- `src/prefs.ts` - Preferences UI (class structure change required)

**Core Logic:**
- `src/app/controller.ts` - Main controller
- `src/settings/extension-settings.ts` - Settings manager
- `src/settings/preferences.ts` - Preferences implementation

**UI Components:**
- `src/app/main-panel/*.ts` - 6 panel-related files
- `src/app/ui/*.ts` - 3 UI component files
- `src/app/debug-panel/*.ts` - 2 debug panel files

**Repository & Utilities:**
- `src/app/repository/*.ts` - 3 repository files
- `src/reloader/*.ts` - 2 development reloader files

## Technical Requirements

### Build System Changes

#### esbuild Configuration
- Module format: `'cjs'` → `'esm'`
- Target: `'es2020'` → `'es2022'`
- Output must be valid ESM modules

#### TypeScript Configuration
- Target: `'ES2020'` → `'ES2022'`
- Module: `'commonjs'` → `'ES2022'`
- Lib: `['ES2020']` → `['ES2022']`
- Remove CommonJS-specific options:
  - Remove `esModuleInterop: true`
  - Remove `allowSyntheticDefaultImports: true`
  - Keep `moduleResolution: "node"` (still needed for ESM)
  - Keep `types: ["vitest/globals"]` (test framework)

#### Package Configuration
- Update `package.json`:
  - Change `"type": "commonjs"` → `"type": "module"`
  - Update `@girs/gnome-shell`: `^45.0.0-beta1` → `^48.0.4` (supports Shell 46)
  - Update other `@girs/*` packages to latest stable versions
  - Maintain existing development tools (TypeScript, esbuild, Biome, Vitest)

### Metadata Changes

```json
{
  "shell-version": ["46"]
}
```

- Change `"shell-version"` from `["42"]` to `["46"]` (ESM incompatible with older versions)

### Import Syntax Migration Patterns

#### Pattern 1: GI Libraries
```typescript
// Before
const St = imports.gi.St;
const Meta = imports.gi.Meta;

// After
import St from 'gi://St';
import Meta from 'gi://Meta';
```

#### Pattern 2: GNOME Shell UI Modules
```typescript
// Before
const Main = imports.ui.main;

// After (in extension.js)
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// After (in prefs.js - different path!)
import * as Main from 'resource:///org/gnome/Shell/Extensions/js/ui/main.js';
```

**Critical:** Resource paths differ between `extension.js` and `prefs.js` contexts.

#### Pattern 3: Deprecated mainloop API
```typescript
// Before (src/app/main-panel/auto-hide.ts)
this.timeoutId = imports.mainloop.timeout_add(delay, () => {});
imports.mainloop.source_remove(this.timeoutId);

// After
import GLib from 'gi://GLib';

this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {});
GLib.Source.remove(this.timeoutId);
```

### Extension Class Structure

#### extension.ts
```typescript
// Before
function init(metadata: ExtensionMetadata): Extension {
  return new Extension(metadata);
}

class Extension {
  constructor(metadata) { /* ... */ }
  enable() { /* ... */ }
  disable() { /* ... */ }
}

// After
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class SnappaExtension extends Extension {
  enable() {
    // this.getSettings() available
    // this.metadata available
    // this.dir, this.path available
  }

  disable() {
    // Cleanup
  }
}
```

#### prefs.ts
```typescript
// Before
function init(metadata) { /* ... */ }
function fillPreferencesWindow(window) { /* ... */ }

// After
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SnappaPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    // this.getSettings() available
    // this.metadata available
  }
}
```

### File Extension Requirements

ESM requires explicit `.js` extensions for relative imports:

```typescript
// ✗ Invalid
import {Controller} from './app/controller';

// ✓ Valid
import {Controller} from './app/controller.js';
```

**Note:** Use `.js` extension in TypeScript source (referring to compiled output).

## Implementation Plan

**Strategy:** Incremental migration with working extension at each step. Each step builds on the previous one, maintaining a buildable and testable state throughout the process.

### Step 1: Minimal Viable Extension (Environment + Hello World)
**Goal:** Create the simplest possible working extension on GNOME Shell 46

**Changes:**
- Update `package.json`:
  - Change `"type": "commonjs"` → `"type": "module"`
  - Update `@girs/gnome-shell` to `^48.0.4`
  - Update other `@girs/*` packages to latest stable versions
  - Run `npm install`
- Update `dist/metadata.json` (directly edit this file):
  - Change `"shell-version"` from `["42"]` to `["46"]`
- Update `tsconfig.json` for ESM:
  - `"target": "ES2022"`
  - `"module": "ES2022"`
  - `"lib": ["ES2022"]`
  - Remove `"esModuleInterop": true`
  - Remove `"allowSyntheticDefaultImports": true`
- Update `esbuild.config.js` for ESM:
  - `format: 'esm'`
  - `target: 'es2022'`
- Delete `src/types/gnome-shell-42.d.ts`
- Replace `src/extension.ts` with minimal implementation:
  ```typescript
  import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

  export default class SnappaExtension extends Extension {
    enable() {
      console.log('[Snappa] Extension enabled');
    }

    disable() {
      console.log('[Snappa] Extension disabled');
    }
  }
  ```
  **Note:** Only modify `src/extension.ts`. Leave other files unchanged (build errors in other files can be ignored at this step).

**Verification:**
```bash
# Build
npm run build

# Install to local extensions directory
npm run copy-files

# Enable extension (on Ubuntu 24.04)
gnome-extensions enable snappa@x7c1.github.io

# Check logs
journalctl -f /usr/bin/gnome-shell | grep Snappa
```
- ✓ Build succeeds
- ✓ Extension enables without errors
- ✓ Console logs appear showing "Extension enabled"
- ✓ Disable/enable works correctly

**Outcome:** Working extension that does nothing but proves the build system works.

---

### Step 2: Development Tools (D-Bus Reload)
**Goal:** Enable fast development workflow with automatic reload

**Rationale:** Migrating the D-Bus reloader early dramatically improves development efficiency for all subsequent steps. Without this, each change requires manual logout/login or `Alt+F2 > r`.

**Changes:**
- Migrate `src/reloader/dbus-reloader.ts`:
  - Convert to ESM: `import Gio from 'gi://Gio'`, `import GLib from 'gi://GLib'`
  - Add `.js` to all relative imports
  - Update D-Bus interface definitions
- Migrate `src/reloader/reloader.ts`:
  - Convert to ESM: `import GLib from 'gi://GLib'`, `import Gio from 'gi://Gio'`
  - Convert `import * as Main from 'resource:///org/gnome/shell/ui/main.js'`
  - Add `.js` to all relative imports
  - Update extension manager references (may need API updates for Shell 46)
- Update `src/extension.ts`:
  - Import reloader modules
  - Initialize D-Bus reloader in `enable()` (conditional on `__DEV__`)
  - Clean up reloader in `disable()`

**Verification:**
```bash
# Build and reload in one command
npm run dev

# Verify D-Bus method works
npm run reload
```
- ✓ Build succeeds
- ✓ Extension reloads without manual restart
- ✓ `npm run dev` works end-to-end
- ✓ D-Bus method calls succeed
- ✓ Console shows reload messages

**Outcome:** Development workflow restored - fast iteration for remaining steps.

---

### Step 3: Basic Panel Display
**Goal:** Display a simple panel on screen (no drag detection yet)

**Changes:**
- Migrate minimal UI components (ESM imports):
  - `src/app/ui/category.ts` - Convert St imports, add `.js` to relative imports
- Create simplified `main-panel/index.ts`:
  - Convert to ESM imports (St, Meta, Main)
  - Create basic BoxLayout panel
  - Add one test button
  - Show panel at fixed position on enable
  - Hide/destroy panel on disable
- Update `extension.ts`:
  - Import and instantiate panel
  - Show panel in `enable()`

**Verification:**
```bash
npm run dev  # Build and reload
```
- ✓ Build succeeds
- ✓ Panel appears on screen at fixed position
- ✓ Panel disappears when extension disabled
- ✓ Fast iteration with `npm run dev`

**Outcome:** Visual confirmation that UI rendering works.

---

### Step 4: Drag Detection & Panel Positioning
**Goal:** Show panel when dragging window to edge

**Changes:**
- Migrate `src/app/controller.ts`:
  - Convert to ESM imports (Meta, GLib, Shell, Main)
  - Add `.js` to relative imports
  - Implement drag detection logic
  - Connect to display signals
- Update `main-panel/position-manager.ts`:
  - Convert to ESM imports (St)
  - Add `.js` to relative imports
  - Implement panel positioning logic
- Update `extension.ts`:
  - Use controller instead of showing panel directly

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Drag window to screen edge → panel appears at cursor
- ✓ Panel positioned correctly relative to cursor

**Outcome:** Core drag-to-show functionality works.

---

### Step 5: Layout Buttons & Window Snapping
**Goal:** Add functional layout buttons that snap windows

**Changes:**
- Migrate layout system:
  - `src/app/repository/extension-path.ts` - Convert GLib imports
  - `src/app/repository/layouts.ts` - Convert Gio imports
  - `src/app/types/*.ts` - Add `.js` to relative imports
  - `src/app/layout-expression/*.ts` - Add `.js` to relative imports
  - `src/app/positioning/*.ts` - Add `.js` to relative imports
- Migrate UI components:
  - `src/app/ui/layout-button.ts` - Convert St, Meta, Main imports
  - `src/app/ui/miniature-display.ts` - Convert St, Clutter imports (including inline usage)
- Update `main-panel/index.ts`:
  - Add layout buttons from repository
  - Wire up click handlers
  - Implement window snapping logic
- Migrate `main-panel/layout-selector.ts`:
  - Convert St imports
  - Add `.js` to relative imports

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Drag window to edge → panel shows with layout buttons
- ✓ Click layout button → window snaps to position
- ✓ Multiple layouts work correctly

**Outcome:** Core snapping functionality complete.

---

### Step 6: Panel Auto-Hide & Cleanup
**Goal:** Add auto-hide behavior and proper cleanup

**Changes:**
- Migrate `src/app/main-panel/auto-hide.ts`:
  - Convert St imports
  - **Critical:** Replace `imports.mainloop.*` with ESM GLib:
    ```typescript
    import GLib from 'gi://GLib';
    this.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {});
    GLib.Source.remove(this.timeoutId);
    ```
  - Add `.js` to relative imports
- Integrate auto-hide into main panel
- Ensure proper cleanup in `disable()`

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Panel auto-hides after delay
- ✓ Panel hides when clicking outside
- ✓ No memory leaks (enable/disable multiple times)

**Outcome:** Panel behavior complete.

---

### Step 7: Keyboard Navigation
**Goal:** Add keyboard controls for panel navigation

**Changes:**
- Migrate `src/app/main-panel/keyboard-navigator.ts`:
  - Convert Clutter, St imports
  - Add `.js` to relative imports
- Integrate into main panel
- Connect keyboard event handlers

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Arrow keys navigate between buttons
- ✓ Vim keys (hjkl) work
- ✓ Enter/Return activates selected button
- ✓ Escape closes panel

**Outcome:** Keyboard navigation works.

---

### Step 8: Settings & Preferences
**Goal:** Add settings management and preferences UI

**Changes:**
- Migrate `src/settings/extension-settings.ts`:
  - Convert Gio imports
  - Update constructor to use `Extension.getSettings()`
  - Simplify implementation
  - Add `.js` to relative imports
- Migrate `src/settings/preferences.ts`:
  - Convert Adw, Gdk, Gio, Gtk, GLib imports
  - Add `.js` to relative imports
- Create `src/prefs.ts`:
  ```typescript
  import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
  import {Preferences} from './settings/preferences.js';

  export default class SnappaPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
      const prefs = new Preferences(this.metadata);
      prefs.fillWindow(window);
    }
  }
  ```
- Update controller to use settings for keyboard shortcuts
- Migrate `src/app/main-panel/renderer.ts`:
  - Convert St, Meta, Main imports
  - Add `.js` to relative imports

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Preferences window opens
- ✓ Can configure keyboard shortcut
- ✓ Keyboard shortcut triggers panel
- ✓ Settings persist across sessions

**Outcome:** Settings system complete.

---

### Step 9: Layout History
**Goal:** Add recently-used layout tracking

**Changes:**
- Migrate `src/app/repository/layout-history.ts`:
  - Convert Gio imports
  - Add `.js` to relative imports
- Integrate history tracking into controller
- Update UI to highlight recent layouts

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds
- ✓ Recently used layouts are highlighted
- ✓ History persists across sessions
- ✓ History updates when layouts are used

**Outcome:** Layout history works.

---

### Step 10: Debug Panel (Development Feature)
**Goal:** Add debug panel for development builds

**Changes:**
- Migrate `src/app/debug-panel/config.ts`:
  - Convert Gio imports
  - Add `.js` to relative imports
- Migrate `src/app/debug-panel/index.ts`:
  - Convert St, Clutter, Main imports
  - Add `.js` to relative imports
  - Migrate test layouts
- Integrate into controller (conditional on `__DEV__`)

**Verification:**
```bash
npm run dev
```
- ✓ Build succeeds (dev mode)
- ✓ Debug panel appears in development builds
- ✓ Debug panel hidden in release builds (`npm run build:release`)
- ✓ Debug toggle works

**Outcome:** Debug features work.

---

### Step 11: Final Polish & Testing
**Goal:** Complete all remaining features and comprehensive testing

**Changes:**
- Review all remaining TODOs
- Clean up any temporary code
- Delete obsolete type definitions:
  - `src/types/st.d.ts`
  - `src/types/glib.d.ts`
  - `src/types/gio.d.ts`
- Keep project-specific types:
  - `src/types/build-mode.d.ts`
  - `src/types/panel.d.ts` (if needed)
- Run full test suite
- Performance profiling

**Verification:**
```bash
# Run all quality checks
npm run build
npm run check
npm run test:run

# Manual testing on Ubuntu 24.04 + GNOME Shell 46
```

**Comprehensive Testing:**
- ✓ All drag-to-edge scenarios
- ✓ All layout buttons work
- ✓ All keyboard shortcuts work
- ✓ All keyboard navigation works
- ✓ Settings UI complete
- ✓ Layout history accurate
- ✓ No console errors (`journalctl -f /usr/bin/gnome-shell`)
- ✓ No memory leaks (enable/disable 10+ times)
- ✓ Performance acceptable
- ✓ Development reload works (`npm run dev`)
- ✓ All tests pass

**Outcome:** Fully functional extension.

---

### Step 12: Documentation & Release Preparation
**Goal:** Update documentation and prepare for release

**Changes:**
- Update README.md:
  - Prerequisites: "GNOME Shell 42" → "GNOME Shell 46"
  - Ubuntu version: 22.04 → 24.04
  - Add migration notes for users upgrading from v1.x
  - Update installation instructions
- Update development guides:
  - ESM-specific development notes
  - Updated build configuration
- Document breaking changes:
  - No backward compatibility with GNOME Shell 44 and earlier
  - Migration guide for developers
- Prepare release notes:
  - Highlight GNOME Shell 46 support
  - List breaking changes
  - Migration path from v1.x

**Verification:**
- ✓ Documentation accurate and complete
- ✓ All links work
- ✓ Installation instructions tested on Ubuntu 24.04
- ✓ Version numbers consistent across all files

**Outcome:** Ready for release.

## Critical Considerations

### No Backward Compatibility

ESM modules are **incompatible with GNOME Shell 44 and earlier**. Users on Ubuntu 22.04 must continue using v1.x.

**Strategy:**
- v2.x supports GNOME Shell 46+ only
- v1.x remains available for GNOME Shell 42 users
- Clear documentation about version compatibility

### Resource Path Differences

Resource paths differ between contexts:

| Context | Path Format |
|---------|-------------|
| `extension.js` | `resource:///org/gnome/shell/...` |
| `prefs.js` | `resource:///org/gnome/Shell/Extensions/js/...` |

**Note:** Case sensitivity matters (`shell` vs `Shell`).

### Logging Changes

```typescript
// Legacy (still works as alias)
log('[Snappa] Message');

// Modern (recommended)
console.log('[Snappa] Message');
console.error('[Snappa] Error');
console.warn('[Snappa] Warning');
```

Prefer explicit `console.*` methods for clarity.

### File Extension Requirements

TypeScript imports must use `.js` extension (referring to compiled output):

```typescript
import {Controller} from './app/controller.js';  // Not .ts
```

This is an ESM requirement and may feel counterintuitive.

## Timeline Estimates

**Total Estimated Effort:** 31-41 points

The incremental approach allows for faster feedback cycles and reduces risk, potentially completing faster than a big-bang migration.

| Step | Description | Points |
|------|-------------|--------|
| Step 1 | Minimal Viable Extension | 4 |
| Step 2 | Development Tools (D-Bus Reload) | 2 |
| Step 3 | Basic Panel Display | 3 |
| Step 4 | Drag Detection & Panel Positioning | 4 |
| Step 5 | Layout Buttons & Window Snapping | 6 |
| Step 6 | Panel Auto-Hide & Cleanup | 3 |
| Step 7 | Keyboard Navigation | 3 |
| Step 8 | Settings & Preferences | 5 |
| Step 9 | Layout History | 2 |
| Step 10 | Debug Panel | 2 |
| Step 11 | Final Polish & Testing | 4 |
| Step 12 | Documentation & Release | 2 |

**Benefits of Incremental Approach:**
- **Early validation:** Issues discovered in Step 1-2 inform later steps
- **Reduced risk:** Each step is small and reversible
- **Continuous testing:** Extension works at every checkpoint
- **Easier debugging:** Problems isolated to recent changes
- **Motivation:** Visible progress at each step
- **Fast iteration:** D-Bus reload available from Step 2 onward

**Risk Factors:**
- Unforeseen API incompatibilities may add 3-5 points per issue
- Learning curve for new Extension API patterns (reduced by incremental discovery)
- D-Bus reloader may need API updates for Shell 46 (accounted for in Step 2 estimate)

## Success Criteria

- [ ] Extension builds without errors using ESM format
- [ ] All TypeScript compilation errors resolved
- [ ] Extension installs and enables on Ubuntu 24.04 + GNOME Shell 46
- [ ] All core functionality works (drag-to-snap, keyboard shortcuts, preferences)
- [ ] No console errors during normal operation
- [ ] Performance matches or exceeds Shell 42 version
- [ ] Development workflow (build, reload) remains functional
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Version management strategy in place

## References

### Official Documentation
- [Port Extensions to GNOME Shell 45 | GJS Guide](https://gjs.guide/extensions/upgrading/gnome-shell-45.html) - Primary migration guide
- [Extensions in GNOME 45 – GNOME Shell & Mutter](https://blogs.gnome.org/shell-dev/2023/09/02/extensions-in-gnome-45/) - Official announcement
- [TypeScript and LSP | GJS Guide](https://gjs.guide/extensions/development/typescript.html) - TypeScript setup

### Community Resources
- [Updating GNOME shell extensions to GNOME 45](https://danigm.net/gnome-45-extensions.html) - Migration walkthrough
- [GNOME 45 Breaks Extensions' Compatibility](https://linuxiac.com/gnome-45-breaks-extensions-compatibility/) - Background

### Package Documentation
- [@girs/gnome-shell - npm](https://www.npmjs.com/package/@girs/gnome-shell) - Type definitions package

## Risk Assessment

**High Risks:**
- Breaking API changes not covered in official documentation
- Resource path issues between extension.js and prefs.js contexts
- D-Bus reloader API changes in GNOME Shell 46

**Medium Risks:**
- Build system configuration issues with ESM
- TypeScript configuration compatibility
- Deprecated API replacements (e.g., mainloop)

**Low Risks:**
- Import syntax conversion (well-documented pattern)
- Type definition updates (provided by @girs packages)
- Testing environment (Ubuntu 24.04 already available)

## Rollback Plan

If critical issues are discovered during testing:

- Revert commits on `main` branch
- Document issues encountered
- Research solutions before retry
- Consider phased rollout (beta testing with subset of users)

## Next Steps

1. Review and approve this plan
2. Begin Step 1 implementation
