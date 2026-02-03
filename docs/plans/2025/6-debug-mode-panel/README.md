# Debug Mode and Debug Panel for SnapMenu

**Status**: Planning
**Created**: 2025-11-26

## Overview

Introduce a comprehensive debugging system for SnapMenu to facilitate UI development, position adjustments, margin adjustments, and size calculations. This system includes a debug mode, debug panel, and extensive test layout groups.

## Background

### Current Development Challenges

The SnapMenu implementation has proven difficult to debug during UI development:

**Specific Issues:**
- Complex hierarchical structure with miniature displays (after Issue #7)
- Manual position calculations using `Clutter.FixedLayout()` within miniature displays
- Multiple interacting spacing values (`menuPadding`, `groupSpacing`, `borderWidth`) that affect layout unexpectedly
- Coordinate transformation across multiple container levels (container → displays → miniatureDisplay → layoutGroup)
- Difficulty verifying visual alignment and sizes during development
- No easy way to test edge cases without modifying production layout groups

**Why This Is Difficult:**
- GNOME Shell's `St` widget system lacks the flexibility of CSS Flexbox/Grid
- No browser-like developer tools for inspecting layout
- Must rebuild and restart GNOME Shell to see changes
- Debugging involves lots of trial and error with position/size values

## Proposed Solution

### 1. Debug Mode

Global toggle to enable/disable all debugging features.

**Implementation:**
```typescript
// Debug mode is controlled by __DEV__ build-time constant
export function isDebugMode(): boolean {
    return __DEV__;
}
```

**Activation Method:**
- `__DEV__` build-time constant: Set by esbuild during build
- Development build: `__DEV__ = true` (debug features enabled)
- Release build: `__DEV__ = false` (all debug features disabled)

### 2. Debug Panel

A control panel displayed alongside the SnapMenu that allows toggling various UI elements on/off in real-time.

**Panel Features:**

#### Toggle Controls
- **Footer rendering** - Show/hide "Powered by Snappa" footer
- **Test layout groups A, B, C, ...** - Individual toggle for each test group
- **Miniature display background** - Show/hide miniature display backgrounds (light black background from Issue #7)
- **Miniature display borders** - Show/hide miniature display borders for size verification
- **Button borders** - Show/hide layout button borders
- **Spacing guides** - Visualize padding and spacing values
- **Size labels** - Display width/height values on each button
- **Layout group separators** - Show visual separators between buttons from different layout groups (optional)

#### Visual Design
```
┌─────────────────────────────────┐
│ Debug Panel                     │
├─────────────────────────────────┤
│ Display Elements                │
│ ☑ Footer                        │
│ ☑ Miniature Display Background  │
│ ☑ Miniature Display Border      │
│ ☑ Button Borders                │
├─────────────────────────────────┤
│ Debug Visualizations            │
│ ☐ Spacing Guides                │
│ ☑ Size Labels                   │
│ ☐ Layout Group Separators       │
├─────────────────────────────────┤
│ Test Layout Groups              │
│ ☑ Group A - Bottom Left Fixed   │
│ ☑ Group B - Bottom Third Split  │
│ ☑ Group C - Top Right Panel     │
│ ☑ Group D - Grid 2x2            │
│ ☐ Group E - Asymmetric Mix      │
│ ☐ Group F - Centered Window     │
│ ☐ Group G - Padded Thirds       │
│ ☐ Group H - Edge Cases          │
│ ☑ Group I - Empty Group         │
└─────────────────────────────────┘
```

**Panel Positioning:**
- Displayed to the right of SnapMenu
- Fixed width: 300px
- Same height as SnapMenu
- Semi-transparent background matching SnapMenu style
- Panel visibility follows SnapMenu: shown when menu is shown, hidden when menu is hidden

**Panel Language:**
- All labels and text in English only

### 3. Test Layout Groups

Comprehensive set of test layouts covering edge cases and various positioning scenarios.

**Test Group Categories:**

#### Group A: Fixed Position Layouts
```typescript
{
    name: 'Test A - Bottom Left Fixed',
    layouts: [
        {
            label: 'Bottom Left',
            x: '20px',
            y: '100% - 320px',
            width: '300px',
            height: '300px',
            zIndex: 0,
        },
    ],
}
```

#### Group B: Bottom Half Split
```typescript
{
    name: 'Test B - Bottom Third Split',
    layouts: [
        {
            label: 'Bottom Left',
            x: '0',
            y: '50%',
            width: '1/3',
            height: '50%',
            zIndex: 0,
        },
        {
            label: 'Bottom Center',
            x: '1/3',
            y: '50%',
            width: '1/3',
            height: '50%',
            zIndex: 0,
        },
        {
            label: 'Bottom Right',
            x: '2/3',
            y: '50%',
            width: '1/3',
            height: '50%',
            zIndex: 0,
        },
    ],
}
```

#### Group C: Right-Aligned Panel
```typescript
{
    name: 'Test C - Top Right Panel',
    layouts: [
        {
            label: 'Top Right',
            x: '100% - 400px',
            y: '0',
            width: '400px',
            height: '50%',
            zIndex: 0,
        },
    ],
}
```

#### Group D: Grid 2x2
```typescript
{
    name: 'Test D - Grid 2x2',
    layouts: [
        {
            label: 'Top Left',
            x: '0',
            y: '0',
            width: '50%',
            height: '50%',
            zIndex: 0,
        },
        {
            label: 'Top Right',
            x: '50%',
            y: '0',
            width: '50%',
            height: '50%',
            zIndex: 0,
        },
        {
            label: 'Bottom Left',
            x: '0',
            y: '50%',
            width: '50%',
            height: '50%',
            zIndex: 0,
        },
        {
            label: 'Bottom Right',
            x: '50%',
            y: '50%',
            width: '50%',
            height: '50%',
            zIndex: 0,
        },
    ],
}
```

#### Group E: Asymmetric Mix
```typescript
{
    name: 'Test E - Asymmetric Mix',
    layouts: [
        {
            label: 'Left Wide',
            x: '0',
            y: '0',
            width: '70%',
            height: '100%',
            zIndex: 0,
        },
        {
            label: 'Top Right',
            x: '70%',
            y: '0',
            width: '30%',
            height: '60%',
            zIndex: 0,
        },
        {
            label: 'Bottom Right',
            x: '70%',
            y: '60%',
            width: '30%',
            height: '40%',
            zIndex: 0,
        },
    ],
}
```

#### Group F: Centered Window
```typescript
{
    name: 'Test F - Centered Window',
    layouts: [
        {
            label: 'Center',
            x: '50% - 400px',
            y: '50% - 300px',
            width: '800px',
            height: '600px',
            zIndex: 0,
        },
    ],
}
```

#### Group G: Padded Layouts
```typescript
{
    name: 'Test G - Padded Thirds',
    layouts: [
        {
            label: 'Left Padded',
            x: '10px',
            y: '10px',
            width: '1/3 - 20px',
            height: '100% - 20px',
            zIndex: 0,
        },
        {
            label: 'Center Padded',
            x: '1/3 + 10px',
            y: '10px',
            width: '1/3 - 20px',
            height: '100% - 20px',
            zIndex: 0,
        },
        {
            label: 'Right Padded',
            x: '2/3 + 10px',
            y: '10px',
            width: '1/3 - 20px',
            height: '100% - 20px',
            zIndex: 0,
        },
    ],
}
```

#### Group H: Edge Cases
```typescript
{
    name: 'Test H - Edge Cases',
    layouts: [
        {
            label: 'Tiny Top Left',
            x: '0',
            y: '0',
            width: '100px',
            height: '100px',
            zIndex: 0,
        },
        {
            label: 'Tiny Bottom Right',
            x: '100% - 100px',
            y: '100% - 100px',
            width: '100px',
            height: '100px',
            zIndex: 0,
        },
    ],
}
```

#### Group I: Empty Layout Group
```typescript
{
    name: 'Test I - Empty Group',
    layouts: [],
}
```

**Purpose**: Test edge case where a layout group has no layouts. This helps verify:
- Menu rendering doesn't crash with empty groups
- Group container height calculation handles zero layouts
- Spacing between groups works correctly when one is empty
- Footer positioning is correct when some groups are empty

## Technical Design

### File Structure

```
src/snap/
├── snap-menu.ts              # Main SnapMenu class
├── debug-panel.ts            # New: DebugPanel class
├── debug-config.ts           # New: Debug configuration and state
└── test-layouts.ts           # New: Test layout groups
```

### Debug Configuration

```typescript
// src/snap/debug-config.ts

export interface DebugConfig {
    // Display element toggles
    showFooter: boolean;
    showMiniatureDisplayBackground: boolean;
    showMiniatureDisplayBorder: boolean;
    showButtonBorders: boolean;

    // Debug visualization toggles
    showSpacingGuides: boolean;
    showSizeLabels: boolean;
    showLayoutGroupSeparators: boolean;

    // Test group toggles
    enabledTestGroups: Set<string>; // Set of enabled test group names
}

// Note: Debug mode enabled/disabled is controlled by __DEV__ build-time constant only.
// This config only stores panel toggle settings.

// Default configuration
const DEFAULT_DEBUG_CONFIG: DebugConfig = {
    showFooter: true,
    showMiniatureDisplayBackground: true,
    showMiniatureDisplayBorder: true,
    showButtonBorders: true,
    showSpacingGuides: false,
    showSizeLabels: true,
    showLayoutGroupSeparators: false,
    enabledTestGroups: new Set([
        'Test A - Bottom Left Fixed',
        'Test B - Bottom Third Split',
        'Test C - Top Right Panel',
        'Test D - Grid 2x2',
        'Test I - Empty Group',
    ]),
};

let currentConfig: DebugConfig = { ...DEFAULT_DEBUG_CONFIG };

// Check if debug mode is enabled based on __DEV__
export function isDebugMode(): boolean {
    return __DEV__;
}

export function getDebugConfig(): DebugConfig {
    return currentConfig;
}

export function setDebugConfig(config: Partial<DebugConfig>): void {
    currentConfig = { ...currentConfig, ...config };
    saveDebugConfig(); // Auto-save on change
}

export function toggleDebugOption(option: keyof Omit<DebugConfig, 'enabledTestGroups'>): void {
    currentConfig[option] = !currentConfig[option];
    saveDebugConfig(); // Auto-save on change
}

export function toggleTestGroup(groupName: string): void {
    if (currentConfig.enabledTestGroups.has(groupName)) {
        currentConfig.enabledTestGroups.delete(groupName);
    } else {
        currentConfig.enabledTestGroups.add(groupName);
    }
    saveDebugConfig(); // Auto-save on change
}

// Persistence functions
const CONFIG_FILE_NAME = 'debug-config.json';

function getConfigFilePath(): string {
    const Me = imports.misc.extensionUtils.getCurrentExtension();
    return GLib.build_filenamev([
        GLib.get_user_data_dir(),
        'gnome-shell',
        'extensions',
        Me.metadata.uuid,
        CONFIG_FILE_NAME
    ]);
}

export function loadDebugConfig(): void {
    const configPath = getConfigFilePath();
    const file = Gio.File.new_for_path(configPath);

    if (!file.query_exists(null)) {
        log('[DebugConfig] Config file does not exist, using defaults');
        return;
    }

    try {
        const [success, contents] = file.load_contents(null);
        if (!success) {
            log('[DebugConfig] Failed to load config file');
            return;
        }

        const decoder = new TextDecoder('utf-8');
        const json = decoder.decode(contents);
        const data = JSON.parse(json);

        // Restore config from JSON
        currentConfig = {
            ...DEFAULT_DEBUG_CONFIG,
            ...data,
            enabledTestGroups: new Set(data.enabledTestGroups || [])
        };

        log('[DebugConfig] Config loaded successfully');
    } catch (e) {
        log(`[DebugConfig] Error loading config: ${e}`);
        // On error, keep using default config
    }
}

export function saveDebugConfig(): void {
    const configPath = getConfigFilePath();
    const file = Gio.File.new_for_path(configPath);

    try {
        // Ensure directory exists
        const parent = file.get_parent();
        if (parent && !parent.query_exists(null)) {
            parent.make_directory_with_parents(null);
        }

        // Convert config to JSON
        const data = {
            ...currentConfig,
            enabledTestGroups: Array.from(currentConfig.enabledTestGroups)
        };
        const json = JSON.stringify(data, null, 2);

        // Write to file
        file.replace_contents(
            json,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );

        log('[DebugConfig] Config saved successfully');
    } catch (e) {
        log(`[DebugConfig] Error saving config: ${e}`);
    }
}
```

### Debug Panel Implementation

```typescript
// src/snap/debug-panel.ts

export class DebugPanel {
    private _container: St.Widget | null = null;
    private _checkboxes: Map<string, St.Button> = new Map();
    private _onConfigChanged: (() => void) | null = null;

    /**
     * Set callback for when debug configuration changes
     */
    setOnConfigChanged(callback: () => void): void {
        this._onConfigChanged = callback;
    }

    /**
     * Show the debug panel at the specified position
     */
    show(x: number, y: number, height: number): void {
        // Create panel container
        // Add checkboxes for each option
        // Connect checkbox toggle events
        // Position panel to the right of SnapMenu
    }

    /**
     * Hide the debug panel
     */
    hide(): void {
        // Clean up and destroy panel
    }

    /**
     * Update panel position
     */
    updatePosition(x: number, y: number): void {
        // Update panel position
    }

    private _createCheckbox(
        label: string,
        checked: boolean,
        onToggle: (checked: boolean) => void
    ): St.Button {
        // Create checkbox widget
        // Connect toggle event
    }
}
```

### SnapMenu Integration

```typescript
// src/snap/snap-menu.ts

export class SnapMenu {
    // ... existing properties ...
    private _debugPanel: DebugPanel | null = null;

    constructor() {
        // ... existing code ...

        // Initialize debug panel only when BUILD_MODE=debug
        if (isDebugMode()) {
            // Load debug configuration from JSON file
            loadDebugConfig();

            this._debugPanel = new DebugPanel();
            this._debugPanel.setOnConfigChanged(() => {
                // Refresh menu when debug config changes
                if (this._container) {
                    const [x, y] = this._container.get_position();
                    this.show(x, y);
                }
            });
        }
    }

    show(x: number, y: number): void {
        // ... existing menu creation code ...

        // Apply debug configuration (only active when debug panel exists)
        const debugConfig = getDebugConfig();

        // Conditionally show/hide footer based on debugConfig.showFooter
        if (this._debugPanel && !debugConfig.showFooter) {
            // Don't add footer
        } else {
            // Add footer (existing code)
        }

        // Apply visual debugging aids to miniature displays
        if (this._debugPanel) {
            if (debugConfig.showMiniatureDisplayBackground) {
                // Show miniature display background (light black from Issue #7)
            }
            if (debugConfig.showMiniatureDisplayBorder) {
                // Add visible border to miniature display containers
            }
            if (debugConfig.showSpacingGuides) {
                // Add spacing visualization
            }
            if (debugConfig.showLayoutGroupSeparators) {
                // Add visual separators between buttons from different layout groups
                // (e.g., different colored borders or overlay lines)
            }
            // ... other debug visualizations ...
        }

        // Filter layout groups
        let layoutGroups = this._layoutGroups;
        if (this._debugPanel) {
            // Add enabled test groups
            const testGroups = getTestLayoutGroups();
            const enabledTestGroups = testGroups.filter((g) =>
                debugConfig.enabledTestGroups.has(g.name)
            );
            layoutGroups = [...layoutGroups, ...enabledTestGroups];
        }

        // ... render layout groups ...

        // Show debug panel
        if (this._debugPanel) {
            const menuWidth = container.width;
            const menuHeight = container.height;
            this._debugPanel.show(x + menuWidth + 20, y, menuHeight);
        }
    }

    hide(): void {
        // ... existing cleanup code ...

        // Hide debug panel
        if (this._debugPanel) {
            this._debugPanel.hide();
        }
    }
}
```

### Test Layouts File

```typescript
// src/snap/test-layouts.ts

import { SnapLayoutGroup } from './snap-menu';

export function getTestLayoutGroups(): SnapLayoutGroup[] {
    return [
        {
            name: 'Test A - Bottom Left Fixed',
            layouts: [
                // ... layout definitions ...
            ],
        },
        {
            name: 'Test B - Bottom Third Split',
            layouts: [
                // ... layout definitions ...
            ],
        },
        // ... all test groups A-H ...
        {
            name: 'Test I - Empty Group',
            layouts: [],
        },
    ];
}
```

## Configuration File Format

The debug configuration is stored as JSON in:
```
~/.local/share/gnome-shell/extensions/snappa@example.com/debug-config.json
```

**Example file content:**
```json
{
  "showFooter": true,
  "showMiniatureDisplayBackground": true,
  "showMiniatureDisplayBorder": true,
  "showButtonBorders": true,
  "showSpacingGuides": false,
  "showSizeLabels": true,
  "showLayoutGroupSeparators": false,
  "enabledTestGroups": [
    "Test A - Bottom Left Fixed",
    "Test B - Bottom Third Split",
    "Test C - Top Right Panel",
    "Test D - Grid 2x2",
    "Test I - Empty Group"
  ]
}
```

**Note:** The `enabled` field is NOT stored in JSON. Debug mode is purely controlled by `__DEV__` build-time constant.

**File Operations:**
- **Created**: Automatically on first config save (only when `__DEV__=true`)
- **Updated**: Immediately on any debug panel toggle
- **Read**: Once in SnapMenu constructor when `__DEV__=true`
- **Reset**: Delete file to restore defaults

## Benefits

### 1. Rapid Development Iteration

- Toggle UI elements on/off without code changes
- Immediately see the effect of hiding/showing different components
- Test multiple layout scenarios quickly

### 2. Visual Debugging

- **Spacing guides** show exact padding/margin values
- **Position/size labels** display calculated pixel values
- **Background/border toggles** reveal container boundaries

### 3. Edge Case Testing

- Extensive test layout groups cover scenarios not in production presets
- Easy to verify corner cases (small windows, right-aligned, centered, etc.)
- Can quickly identify calculation errors

### 4. Development Workflow Example

```
Developer workflow:
1. Enable debug mode
2. Show SnapMenu with debug panel
3. Toggle off footer → check if menu height calculation is correct
4. Enable "Test A - Bottom Left Fixed" → verify fixed positioning works
5. Enable spacing guides → check if padding values are correct
6. Toggle position labels → verify x/y calculations
7. Make code changes
8. Rebuild and see results immediately
9. Iterate quickly without modifying production layouts
```

### 5. Persistent Configuration

- **Settings preserved across reloads** - Debug panel state is saved to JSON file
- **Automatic save** - Every toggle action immediately saves to disk
- **No manual configuration** - Simply use the debug panel, settings are remembered
- **Per-developer settings** - Each user has their own debug preferences
- **Easy to reset** - Delete JSON file to return to defaults

## Implementation Plan

### Phase 1: Debug Configuration
1. Create `debug-config.ts` with configuration interface
2. Implement `isDebugMode()` function to check `__DEV__` build-time constant
3. Implement JSON file persistence
   - `loadDebugConfig()` - Load from `~/.local/share/gnome-shell/extensions/[uuid]/debug-config.json`
   - `saveDebugConfig()` - Save on every config change
   - Called from SnapMenu constructor only when `isDebugMode()` returns true

### Phase 2: Test Layouts
1. Create `test-layouts.ts`
2. Implement all test layout groups (A-H)
3. Test layouts render correctly

### Phase 3: Debug Panel UI
1. Create `DebugPanel` class in `debug-panel.ts`
2. Implement checkbox controls
3. Implement panel positioning
4. Connect to debug configuration

### Phase 4: SnapMenu Integration
1. Add `isDebugMode()` check in SnapMenu constructor
2. Instantiate debug panel only when in debug mode
3. Apply debug configuration to UI rendering using `if (this._debugPanel)` checks
4. Implement conditional footer rendering
5. Add test group filtering

### Phase 5: Visual Debug Aids
1. Implement spacing guides visualization
2. Implement size labels
3. Implement background/border toggles

### Phase 6: Testing & Polish
1. Test all debug features with development build (`__DEV__=true`)
2. Verify no debug features appear with release build (`__DEV__=false`)
3. Document debug mode usage

## Future Enhancements

### Additional Debug Features
- **Performance metrics** - Show render time for each layout group
- **Mouse position display** - Show current cursor coordinates
- **Layout validation** - Warn about overlapping layouts or gaps
- **Export layout** - Copy current layout as JSON for sharing

### Advanced Visualizations
- **Heat map** - Highlight areas with most overlapping buttons
- **Alignment guides** - Show when layouts are aligned to grid
- **Measurement tools** - Click two points to see distance

## Design Decisions

### Debug Mode Activation
- **Single check point**: Debug mode is determined ONLY by checking `__DEV__` in `SnapMenu` constructor
- **Panel presence as flag**: Throughout the code, `if (this._debugPanel)` is used instead of repeatedly checking `isDebugMode()`
- **No scattered checks**: Debug mode logic is NOT checked in config functions, toggle handlers, or rendering code

### Configuration Persistence
- Debug panel toggle settings (checkboxes) are saved to JSON file
- The `enabled` flag is NOT stored in JSON; it's purely determined by `__DEV__`
- Config is loaded only once in constructor when `isDebugMode()` returns true

### Panel Lifecycle
- Panel follows menu lifecycle: shown when menu shows, hidden when menu hides
- No independent persistence of panel state between menu show/hide cycles

### Test Layouts
- Hardcoded in `test-layouts.ts` TypeScript file
- No external JSON file loading for test layouts

## References

- Current SnapMenu implementation: `src/snap/snap-menu.ts`
- Related: Issue #5 - Layout Expression System
- Related: Issue #7 - Snap Menu Display Structure (hierarchical structure with miniature displays)
- GNOME Shell documentation for UI debugging

## Notes on Issue #7 Integration

**Important**: This debug system must work with Issue #7's new structure:
```
container (BoxLayout vertical)
├── displays (BoxLayout horizontal)
│   └── miniatureDisplay (St.Widget) × N
│       └── buttons (St.Button) - from all layout groups
└── footer (St.Label)
```

Key implications for debugging:
- **Single background**: Only miniature display background (no layout group containers)
- **Layout groups are logical only**: No visual containers for groups
- **Coordinate hierarchy**: Debug panel should show: screen → container → displays → miniatureDisplay → button
- **Position labels**: Button positions should be relative to miniature display, not screen
- **Size verification**: Miniature display size needs to be debuggable
- **Group identification**: Optional visual separators to distinguish buttons from different layout groups

Implement this debug system after Issue #7 is completed.
