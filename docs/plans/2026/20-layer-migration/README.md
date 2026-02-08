# Layer Migration

Status: Completed

## Overview

This plan defines the migration strategy for moving existing code from `src/app/service/` and `src/app/repository/` to the new layer architecture established in PR #38. The new layer structure (domain, usecase, infra) is already in place; this plan covers migrating all existing code to appropriate layers and updating consumers.

## Background

### Current State

PR #38 introduced the new layer architecture:
- `src/domain/` - Validated types and domain models
- `src/usecase/` - Interfaces for repositories and API clients
- `src/infra/` - Infrastructure implementations (GSettings, HTTP, file)

However, the existing code still uses the old structure:
- `src/app/service/license/` - License management
- `src/app/repository/` - History, space collection, utilities
- `src/app/service/` - Custom import, preset generator, etc.

Both old and new code coexist, causing duplication and confusion.

### Problem

- Duplicate implementations: Old code in `src/app/`, new code in `src/infra/`
- Consumers still import from old locations
- No runtime validation on external data in old code
- Domain objects not used in business logic
- Utility functions scattered in repository layer

## Goals

- Move all code to appropriate layers (domain, usecase, infra)
- Delete all files from `src/app/service/` and `src/app/repository/`
- Update all consumers to import from new locations
- Maintain all existing functionality and tests

## Non-Goals

- Adding new features during migration
- Changing external interfaces (GSettings keys, file formats)
- Refactoring unrelated code in `src/app/` (main-panel, ui, etc.)

## Migration Inventory

### Files to Delete → Replacement Already Exists

| File | Replacement |
|------|-------------|
| `src/app/service/license/license-client.ts` | `src/infra/api/http-license-api-client.ts` |
| `src/app/service/license/license-storage.ts` | `src/infra/gsettings/gsettings-license-repository.ts` |
| `src/app/service/license/index.ts` | Re-exports only, no replacement needed |
| `src/app/repository/history.ts` | `src/infra/file/file-layout-history-repository.ts` |
| `src/app/repository/space-collection.ts` | `src/infra/file/file-space-collection-repository.ts` |

### Files to Migrate → New Location

| File | New Location | Reason |
|------|--------------|--------|
| `src/app/repository/uuid-generator.ts` | `src/libs/uuid/index.ts` | Generic utility, not sutto-specific |
| `src/app/repository/layout-hash-generator.ts` | `src/domain/layout/layout-hash.ts` | Pure function, sutto domain logic |
| `src/app/repository/history-compaction.ts` | `src/domain/history/compaction.ts` | Pure algorithm on domain types |
| `src/app/repository/extension-path.ts` | `src/infra/file/extension-path.ts` | GLib dependency |
| `src/app/service/license/license-manager.ts` | `src/usecase/licensing/license-service.ts` | Orchestration logic |
| `src/app/service/license/trial-manager.ts` | Merged into `license-service.ts` | Uses domain `Trial` |
| `src/app/service/active-space-collection.ts` | `src/usecase/layout/active-collection.ts` | Orchestration logic |
| `src/app/service/custom-import.ts` | `src/usecase/layout/import-collection.ts` | Orchestration logic |

### Files to Split → Multiple Locations

**`src/app/service/preset-generator.ts`** splits into:
- `src/domain/layout/preset-generator.ts` - Pure preset generation logic
- `src/infra/monitor/gdk-monitor-detector.ts` - Gdk/Gio monitor detection
- `src/usecase/layout/ensure-preset.ts` - Orchestration

### Files to Delete After Migration

After all consumers are updated:
- `src/app/service/license/index.ts`
- `src/app/service/license/license-client.ts`
- `src/app/service/license/license-storage.ts`
- `src/app/service/license/license-manager.ts`
- `src/app/service/license/trial-manager.ts`
- `src/app/repository/history.ts`
- `src/app/repository/space-collection.ts`
- `src/app/repository/uuid-generator.ts`
- `src/app/repository/layout-hash-generator.ts`
- `src/app/repository/history-compaction.ts`
- `src/app/repository/extension-path.ts`
- `src/app/service/active-space-collection.ts`
- `src/app/service/custom-import.ts`
- `src/app/service/preset-generator.ts`

### Consumer Files to Update

| File | Changes Needed |
|------|----------------|
| `src/app/controller.ts` | Import from usecase/infra |
| `src/app/main-panel/index.ts` | Update imports |
| `src/app/main-panel/renderer.ts` | Update imports |
| `src/app/ui/miniature-space.ts` | Update LayoutHistoryRepository import |
| `src/app/ui/miniature-display.ts` | Update LayoutHistoryRepository import |
| `src/app/window/layout-applicator.ts` | Update imports |
| `src/settings/license-ui.ts` | Import from usecase/infra |
| `src/settings/preferences.ts` | Update imports |
| `src/settings/spaces-page.ts` | Update imports |

### Test Files to Update

| File | Changes Needed |
|------|----------------|
| `src/app/service/license/trial-manager.test.ts` | Move to `src/domain/licensing/` |
| `src/app/repository/history-compaction.test.ts` | Move to `src/domain/history/` |

## Implementation Plan

### Phase 1: Migrate Pure Functions

Move pure functions to appropriate locations.

**Tasks:**
- Create `src/libs/uuid/index.ts` from `uuid-generator.ts` (generic utility)
- Create `src/libs/tsconfig.json` for libs layer
- Create `src/domain/layout/layout-hash.ts` from `layout-hash-generator.ts`
- Move `history-compaction.ts` to `src/domain/history/compaction.ts`
  - Update to use `LayoutEvent` domain type
  - Move `history-compaction.test.ts` alongside
- Update domain index exports

**Estimated effort**: 2 points

### Phase 2: Migrate Infrastructure Utilities

Move infrastructure-dependent utilities.

**Tasks:**
- Move `extension-path.ts` to `src/infra/file/extension-path.ts`
- Create `src/infra/monitor/gdk-monitor-detector.ts` from preset-generator's Gdk code
- Update infra index exports

**Estimated effort**: 2 points

### Phase 3: Create LicenseService in UseCase Layer

Create the main license orchestration service.

**Tasks:**
- Create `src/usecase/licensing/license-service.ts`
  - Uses `LicenseApiClient` interface
  - Uses `LicenseRepository` interface
  - Works with domain objects (`License`, `Trial`)
  - Handles state transitions
- Keep GLib timer in a thin infra wrapper or controller
- Move `trial-manager.test.ts` to domain layer

**Estimated effort**: 5 points

### Phase 4: Migrate Layout UseCase Functions

**Tasks:**
- Create `src/usecase/layout/active-collection.ts` from `active-space-collection.ts`
- Create `src/usecase/layout/import-collection.ts` from `custom-import.ts`
  - Extract validation logic to domain if appropriate
- Create `src/domain/layout/preset-generator.ts` (pure logic)
- Create `src/usecase/layout/ensure-preset.ts` (orchestration)
- Update usecase index exports

**Estimated effort**: 4 points

### Phase 5: Update All Consumers

Update all files that import from old locations.

**Tasks:**
- Update `src/app/controller.ts`
- Update `src/app/main-panel/index.ts`
- Update `src/app/main-panel/renderer.ts`
- Update `src/app/ui/miniature-space.ts`
- Update `src/app/ui/miniature-display.ts`
- Update `src/app/window/layout-applicator.ts`
- Update `src/settings/license-ui.ts`
- Update `src/settings/preferences.ts`
- Update `src/settings/spaces-page.ts`
- Verify all imports resolve correctly

**Estimated effort**: 3 points

### Phase 6: Delete Legacy Files and Cleanup

**Tasks:**
- Delete all files listed in "Files to Delete After Migration"
- Remove empty directories
- Verify build succeeds
- Run full test suite
- Manual testing of extension functionality

**Estimated effort**: 2 points

## Dependency Graph

```
Phase 1 (Pure Functions)
    ↓
Phase 2 (Infra Utilities)
    ↓
Phase 3 (LicenseService) ←──┐
    ↓                       │
Phase 4 (Layout UseCases) ──┘ (can be parallelized with Phase 3)
    ↓
Phase 5 (Update Consumers)
    ↓
Phase 6 (Delete Legacy)
```

## Risks

- **GLib timer integration**: `LicenseManager` uses GLib for periodic validation. Decision needed: keep in controller or create infra wrapper.
- **Type compatibility**: Some consumers may expect raw types. May need adapter functions during transition.
- **Settings UI complexity**: `license-ui.ts` and `spaces-page.ts` have GTK integrations.

## Success Criteria

- All files in `src/app/service/` deleted
- All files in `src/app/repository/` deleted
- All existing tests pass
- Build succeeds without warnings
- Manual testing confirms all functionality works

## Timeline

| Phase | Points | Dependencies |
|-------|--------|--------------|
| Phase 1: Pure Functions | 2 | None |
| Phase 2: Infra Utilities | 2 | Phase 1 |
| Phase 3: LicenseService | 5 | Phase 2 |
| Phase 4: Layout UseCases | 4 | Phase 2 |
| Phase 5: Update Consumers | 3 | Phases 3, 4 |
| Phase 6: Delete Legacy | 2 | Phase 5 |

**Total estimated effort**: 18 points

Phases 3 and 4 can be parallelized after Phase 2.
