# Sub-Plan 3: Enforce LayoutId Type Safety

## Overview

Replace raw `string` usage for layout IDs with the `LayoutId` domain type across all layers. Currently, `LayoutId` is used at the history repository boundary, but the UI layer, composition callbacks, and miniature display all pass layout IDs as raw `string`. The domain model `Layout.id` is also `string`.

## Problem

Layout IDs flow as raw strings through several paths:

- `LayoutApplicationCallbacks.onLayoutApplied` uses `(layoutId: string, monitorKey: string)` callback signature
- `MainPanel.updateSelectedLayoutHighlight()` accepts `string`
- `LayoutButtonStyleUpdater.updateSelectedLayoutHighlight()` accepts `string` and compares with `layout.id === newSelectedLayoutId`
- `miniature-display.ts` converts `LayoutId` from repository back to `string` for comparison with `layout.id`
- `extractLayoutIds()` returns `Set<string>` instead of `Set<LayoutId>`

This means invalid layout IDs would not be caught by the type system.

## Scope

Domain types, composition (layout-applicator, controller), UI (main-panel, miniature-display, layout-button-style-updater), domain utility function.

## Changes

### Domain Layer

#### `src/domain/layout/types.ts`

- Change `Layout.id` from `string` to `LayoutId`

#### `src/domain/layout/extract-layout-ids.ts`

- Change return type from `Set<string>` to `Set<LayoutId>`
- `ids.add(layout.id)` now adds `LayoutId` directly

### Composition Layer

#### `src/composition/window/layout-applicator.ts`

- Change `LayoutApplicationCallbacks.onLayoutApplied` parameter from `string` to `LayoutId`
- Pass `layout.id` directly (now `LayoutId` from domain model)
- Remove manual `new LayoutId(layout.id)` construction for history repository call — `layout.id` is already `LayoutId`

#### `src/composition/controller.ts`

- `getAllValidLayoutIds()`: Return type changes from `Set<string>` to `Set<LayoutId>` (follows `extractLayoutIds()`)
- `onLayoutApplied` callback: Receives `LayoutId` directly, passes to `MainPanel.updateSelectedLayoutHighlight()`

### Infrastructure Layer

#### `src/infra/file/file-space-collection-repository.ts`

- Add conversion between JSON string IDs and `LayoutId` during serialization/deserialization
  - Loading: Convert raw JSON `id: string` to `LayoutId` when constructing `Layout`
  - Saving: Convert `LayoutId` to string via `toString()` before JSON serialization

#### `src/infra/file/file-layout-history-repository.ts`

- Update `validLayoutIds` field from `Set<string>` to `Set<LayoutId>`
- Update filtering logic to use `LayoutId.equals()` for membership checks

### UI Layer

#### `src/ui/main-panel/index.ts`

- Change `updateSelectedLayoutHighlight()` parameter from `string` to `LayoutId`

#### `src/ui/main-panel/layout-button-style-updater.ts`

- Change `updateSelectedLayoutHighlight()` `newSelectedLayoutId` parameter from `string` to `LayoutId`
- Update comparison: `layout.id.equals(newSelectedLayoutId)` instead of `layout.id === newSelectedLayoutId`

#### `src/ui/components/miniature-display.ts`

- Change `selectedLayoutId` variable from `string | null` to `LayoutId | null`
- Store `LayoutId` directly from repository (no `.toString()` conversion)
- Update comparison: `layout.id.equals(selectedLayoutId)` instead of `===`

## Estimate

- 5 points
