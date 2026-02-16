# App Layer Decomposition

Status: Completed

## Overview

This plan completes the layer architecture migration by decomposing `src/app/` into appropriate layers and removing the temporary facade layer. Plan 20 introduced the layer architecture but left code in `src/app/facade/` for backward compatibility. This plan eliminates that intermediate state and properly distributes all application code.

## Background

### Current State

After Plan 20, the codebase has:
- **domain/**: Value objects, pure business logic (partially populated)
- **usecase/**: Interfaces and orchestration (partially populated)
- **infra/**: Infrastructure implementations (file I/O, HTTP, GSettings)
- **libs/**: Generic utilities (UUID)
- **app/facade/**: Backward-compatible wrappers (temporary, to be removed)
- **app/**: Mixed concerns - UI, infrastructure, and pure logic intermingled

### Problem

- `src/app/facade/` exists as a temporary compatibility layer
- `src/app/` contains pure logic that belongs in domain layer
- Responsibilities are mixed within single modules
- No clear separation between GNOME Shell lifecycle and application wiring
- Testing pure logic requires mocking GNOME Shell dependencies unnecessarily

## Target Architecture

```
src/
├── extension.ts        # GNOME Shell entry point (minimal)
├── composition/        # Root composition - dependency wiring
├── ui/                 # GNOME Shell UI (St widgets, rendering)
├── usecase/            # Application logic, interfaces
├── infra/              # External dependencies (GLib, file I/O, HTTP)
├── domain/             # Pure business logic, value objects
├── libs/               # Generic utilities (UUID, reloader, etc.)
├── prefs/              # GTK preferences UI (ExtensionPreferences subclass)
```

### Layer Responsibilities

| Layer | Responsibility | Dependencies |
|-------|----------------|--------------|
| `extension.ts` | GNOME Shell lifecycle, DBusReloader | composition, libs |
| `composition/` | Dependency wiring, signal routing, state coordination | ui, usecase, infra |
| `ui/` | St widgets, rendering, GNOME Shell UI integration | domain, usecase interfaces |
| `usecase/` | Business logic orchestration, interface definitions | domain |
| `infra/` | GLib timers, file I/O, HTTP, GSettings implementations | usecase interfaces, domain |
| `domain/` | Pure functions, value objects, type definitions | (none) |
| `libs/` | Generic reusable utilities (UUID, extension reloader, etc.) | (none) |
| `prefs/` | GTK preferences UI (ExtensionPreferences subclass) | domain, usecase, infra, libs |

### Signal Handling Flow

```
[GNOME Shell Signal]
    → infra (connection management)
    → composition (event routing)
    → usecase (business logic)
    → ui (screen update)
```

`ui` and `infra` do not know each other directly. `composition` is the only layer that knows all layers.

### Prefs (GTK) Layer Constraints

`src/prefs/` is a separate entry point (`prefs.js`) that runs in a GTK process, NOT in GNOME Shell. It uses Gtk/Adw instead of St/Meta/Clutter.

**Prefs CAN import from:**
- `domain/` - Pure logic, type definitions
- `usecase/` - Interfaces, orchestration functions
- `infra/` - Only Gio/GLib-based implementations (file I/O, GSettings)
- `libs/` - Generic utilities

**Prefs CANNOT import from:**
- `ui/` - St widgets (GNOME Shell only)
- `composition/` - GNOME Shell signal wiring

**Current prefs dependencies on `src/app/`:**

| File | Imports | Migration Target |
|------|---------|------------------|
| `preferences.ts` | `app/facade/` | `infra/`, `usecase/` |
| `preferences.ts` | `app/constants.js` | `domain/constants.ts` |
| `spaces-page.ts` | `app/facade/` | `infra/`, `usecase/` |
| `spaces-page.ts` | `app/types/` | `domain/types/` |
| `license-ui.ts` | `app/facade/license/` | `usecase/`, `infra/` |
| `monitors.ts` | `app/constants.js` | `domain/constants.ts` |
| `monitors.ts` | `app/types/` | `domain/types/` |
| `gtk-miniature-space.ts` | `app/constants.js` | `domain/constants.ts` |
| `gtk-miniature-space.ts` | `app/types/` | `domain/types/` |
| `gtk-miniature-display.ts` | `app/types/` | `domain/types/` |

## Analysis Summary

| Current Location | Pure Logic | Target Layer |
|------------------|------------|--------------|
| `app/layout-expression/` | 100% | domain |
| `app/positioning/` | 100% | domain |
| `app/types/` | 100% | domain (split) |
| `app/ui/space-dimensions.ts` | 100% | domain |
| `app/config/base-layout-groups.ts` | 100% | domain (preset-config.ts) |
| `app/drag/edge-detector.ts` | ~80% | domain (extract) |
| `app/window/layout-applicator.ts` | ~50% | domain (extract) |
| `app/main-panel/state.ts` | 100% | domain |
| `app/controller.ts` | ~10% | composition |
| `app/main-panel/` | ~20% | ui |
| `app/ui/` | ~20% | ui |
| `app/drag/` (timers) | 0% | infra |
| `app/monitor/` | ~30% | infra + domain |
| `app/shortcuts/` | 0% | infra |
| `app/facade/` | 0% | (delete) |

## Goals

- Remove `src/app/facade/` entirely
- Move all pure logic from `src/app/` to `src/domain/`
- Create `src/composition/` for dependency wiring
- Rename/move UI code from `src/app/` to `src/ui/`
- Establish clear layer boundaries
- Keep `extension.ts` minimal (~70 lines)

## Non-Goals

- Changing external behavior or user-facing functionality
- Adding new features
- Refactoring internal structure of `src/prefs/` (only updating imports)

## Implementation Plan

### Phase 1: Move Pure Modules to Domain and Libs

Move complete modules that contain only pure/generic logic. This is the safest phase with no behavior changes.

**Tasks (domain):**
- Move `src/app/layout-expression/` → `src/domain/layout-expression/`
- Move `src/app/positioning/` → `src/domain/positioning/`
- Move `src/app/ui/space-dimensions.ts` → `src/domain/ui/space-dimensions.ts`
- Move `src/app/config/base-layout-groups.ts` → `src/domain/layout/preset-config.ts`

**Tasks (libs):**
- Move `src/reloader/` → `src/libs/reloader/`
- Update `src/extension.ts` to import from `libs/reloader/`

**Tasks (prefs rename):**
- Rename `src/settings/` → `src/prefs/`
- Update `src/prefs.ts` entry point import (`./settings/` → `./prefs/`)
- Verify `esbuild.config.js` (no changes needed - entry points unchanged)

**Files to move (domain):**
- `src/app/layout-expression/types.ts`
- `src/app/layout-expression/parser.ts`
- `src/app/layout-expression/evaluator.ts`
- `src/app/layout-expression/parser.test.ts`
- `src/app/layout-expression/evaluator.test.ts`
- `src/app/positioning/types.ts`
- `src/app/positioning/boundary-adjuster.ts`
- `src/app/ui/space-dimensions.ts`
- `src/app/config/base-layout-groups.ts` → `src/domain/layout/preset-config.ts`

**Files to move (libs):**
- `src/reloader/reloader.ts` → `src/libs/reloader/reloader.ts`
- `src/reloader/dbus-reloader.ts` → `src/libs/reloader/dbus-reloader.ts`

**Consumers to update:**
- `src/app/window/layout-applicator.ts`
- `src/app/ui/layout-button.ts`
- `src/app/main-panel/position-manager.ts`
- `src/extension.ts` (for reloader)

**Estimated effort**: 4 points

### Phase 2: Split Type Definitions and Constants

Separate domain types from application-specific types. Move shared constants.

**Tasks:**
- Create `src/domain/types/` for core domain types
- Move geometry types: `Position`, `Size`
- Move layout types: `Layout`, `LayoutGroup`, `LayoutSetting`
- Move space types: `Space`, `SpaceCollection`, `SpacesRow`
- Move monitor types: `Monitor`, `MonitorEnvironment`
- Keep application types in `src/app/types/`: `LayoutSelectedEvent`, `LayoutButtonWithMetadata`
- Move shared constants (`DEFAULT_MONITOR_WIDTH/HEIGHT`, file names) to `src/domain/constants.ts`
- Keep UI-specific constants (colors, styling) in ui layer
- Update all imports (including `src/prefs/`)

**Estimated effort**: 4 points

### Phase 3: Create Composition Layer

Extract root composition from controller.ts.

**Tasks:**
- Create `src/composition/` directory
- Move `src/app/controller.ts` → `src/composition/app-coordinator.ts`
- Update `src/extension.ts` to import from composition
- Create `src/composition/tsconfig.json`
- Split into sub-coordinators if needed:
  - `drag-wiring.ts` - drag signal connection and routing
  - `license-wiring.ts` - license initialization and state
  - `panel-wiring.ts` - panel show/hide coordination

**Estimated effort**: 3 points

### Phase 4: Remove Facade Layer

Replace facade usage with direct layer access. This phase requires careful handling of both GNOME Shell (composition) and GTK (prefs) consumers.

**Tasks for composition layer:**
- Update `src/composition/app-coordinator.ts` to use infra repositories directly
- Use `FileSpaceCollectionRepository` instead of facade functions
- Use `LicenseService` from usecase instead of facade license manager

**Tasks for prefs layer (GTK):**
- Update `src/prefs/spaces-page.ts`:
  - Import `FileSpaceCollectionRepository` from `infra/file/`
  - Import usecase functions for collection operations
- Update `src/prefs/preferences.ts`:
  - Use infra repositories directly
  - Use `ensurePresetForCurrentMonitors` from usecase
- Update `src/prefs/license-ui.ts`:
  - Use `LicenseService` from usecase
  - Use `GSettingsLicenseRepository` from infra

**Files to delete:**
- `src/app/facade/active-space-collection.ts`
- `src/app/facade/custom-import.ts`
- `src/app/facade/preset-generator.ts`
- `src/app/facade/space-collection.ts`
- `src/app/facade/license/` (entire directory)
- `src/app/facade/index.ts`

**Note:** Prefs instantiates repositories at module level since GTK preferences don't support the same DI patterns as GNOME Shell extension lifecycle.

**Estimated effort**: 5 points

### Phase 5: Move UI Code

Move GNOME Shell UI components to dedicated ui layer.

**Tasks:**
- Rename `src/app/ui/` → `src/ui/components/`
- Move `src/app/main-panel/` → `src/ui/main-panel/`
- Update imports in composition layer
- Create `src/ui/tsconfig.json`

**Files to move:**
- `src/app/ui/layout-button.ts` → `src/ui/components/layout-button.ts`
- `src/app/ui/miniature-display.ts` → `src/ui/components/miniature-display.ts`
- `src/app/ui/miniature-space.ts` → `src/ui/components/miniature-space.ts`
- `src/app/main-panel/*` → `src/ui/main-panel/*`

**Estimated effort**: 3 points

### Phase 6: Move Infrastructure Code

Move GNOME Shell infrastructure to infra layer.

**Tasks:**
- Move `src/app/drag/` → `src/infra/drag/` (GLib timer wrappers)
- Move `src/app/shortcuts/` → `src/infra/shortcuts/`
- Move `src/app/monitor/` → `src/infra/monitor/`
- Move `src/app/window/` → `src/infra/window/`
- Extract pure logic from these modules to domain during move

**Estimated effort**: 4 points

### Phase 7: Extract Pure Logic from Mixed Modules

Extract pure calculations from modules with mixed concerns.

**Tasks:**

**7a. Edge Detection**
- Extract `EdgeDetector` geometry logic to `src/domain/drag/edge-detector.ts`
- Keep GLib timer wrappers in `src/infra/drag/`

**7b. Layout Calculation**
- Extract layout position/size calculation to `src/domain/window/layout-calculator.ts`
- Keep `LayoutApplicator` in `src/infra/window/` for Meta.Window operations

**7c. Monitor Geometry**
- Extract bounding box calculation to `src/domain/monitor/geometry.ts`
- Extract environment ID generation to domain
- Keep `MonitorManager` in `src/infra/monitor/` for GNOME Shell integration

**7d. Panel State**
- Move `MainPanelState` to `src/domain/panel/state.ts` as value object

**Estimated effort**: 5 points

### Phase 8: Final Cleanup

**Tasks:**
- Delete `src/app/` directory (should be empty)
- Remove empty directories
- Update all index.ts exports
- Verify all tests pass
- Verify build succeeds
- Run biome check

**Estimated effort**: 1 point

## Dependency Graph

```
Phase 1 (Pure Modules)
    ↓
Phase 2 (Types Split)
    ↓
Phase 3 (Composition Layer)
    ↓
Phase 4 (Facade Removal)
    ↓
Phase 5 (UI Layer)
    ↓
Phase 6 (Infra Layer)
    ↓
Phase 7 (Extract Pure Logic)
    ↓
Phase 8 (Cleanup)
```

Phases 5-7 could potentially be parallelized after Phase 4, but sequential execution is safer.

## Risks

- **Import cycles**: Moving types may create circular dependencies. Solution: careful ordering and index.ts management.
- **Prefs/Extension divergence**: Prefs (GTK) and extension (GNOME Shell) are separate processes with different available APIs. Solution: ensure shared code only uses Gio/GLib (available in both), keep St/Meta code isolated in ui/composition layers.
- **Prefs instantiation**: GTK preferences can't use the same DI patterns as GNOME Shell. Solution: instantiate repositories at module level in prefs.
- **Test coverage gaps**: Extracting logic may reveal untested paths. Solution: add tests during extraction.
- **Composition layer size**: May grow large with all wiring. Solution: split into sub-coordinators proactively.

## Success Criteria

- `src/app/` directory deleted
- `src/app/facade/` directory deleted
- All pure logic resides in `src/domain/`
- All GNOME Shell UI code resides in `src/ui/`
- All infrastructure code resides in `src/infra/`
- Root composition in `src/composition/` with clear wiring
- `extension.ts` remains minimal (~70 lines)
- `src/prefs/` imports only from domain, usecase, infra, libs (no ui, no composition)
- All tests pass
- Build succeeds
- No new biome errors

## Final Directory Structure

```
src/
├── extension.ts                    # GNOME Shell entry point
├── composition/
│   ├── index.ts                    # AppCoordinator
│   ├── drag-wiring.ts              # (optional)
│   ├── license-wiring.ts           # (optional)
│   └── tsconfig.json
├── ui/
│   ├── components/
│   │   ├── layout-button.ts
│   │   ├── miniature-display.ts
│   │   └── miniature-space.ts
│   ├── main-panel/
│   │   ├── index.ts
│   │   ├── renderer.ts
│   │   ├── auto-hide.ts
│   │   ├── keyboard-navigator.ts
│   │   └── ...
│   └── tsconfig.json
├── usecase/
│   ├── layout/
│   ├── licensing/
│   ├── history/
│   └── tsconfig.json
├── infra/
│   ├── drag/
│   ├── monitor/
│   ├── shortcuts/
│   ├── window/
│   ├── file/
│   ├── api/
│   ├── gsettings/
│   └── tsconfig.json
├── domain/
│   ├── layout/
│   │   ├── preset-generator.ts
│   │   ├── preset-config.ts        # Moved from app/config/base-layout-groups.ts
│   │   └── ...
│   ├── layout-expression/
│   ├── positioning/
│   ├── history/
│   ├── licensing/
│   ├── monitor/
│   ├── panel/
│   ├── types/
│   └── tsconfig.json
├── libs/
│   ├── uuid/
│   ├── reloader/                   # Generic GNOME Shell extension reloader
│   └── tsconfig.json
└── prefs/                          # GTK preferences (renamed from settings/)
    ├── index.ts                    # ExtensionPreferences subclass
    ├── preferences.ts
    ├── spaces-page.ts
    ├── license-ui.ts
    ├── monitors.ts
    ├── gtk-miniature-space.ts
    ├── gtk-miniature-display.ts
    └── ...
```

## Timeline

| Phase | Points | Dependencies |
|-------|--------|--------------|
| Phase 1: Pure Modules + Libs | 4 | None |
| Phase 2: Types Split | 4 | Phase 1 |
| Phase 3: Composition Layer | 3 | Phase 2 |
| Phase 4: Facade Removal | 5 | Phase 3 |
| Phase 5: UI Layer | 3 | Phase 4 |
| Phase 6: Infra Layer | 4 | Phase 4 |
| Phase 7: Extract Pure Logic | 5 | Phases 5, 6 |
| Phase 8: Cleanup | 1 | Phase 7 |

**Total estimated effort**: 29 points
