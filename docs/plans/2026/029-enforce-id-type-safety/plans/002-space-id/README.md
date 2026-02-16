# Sub-Plan 2: Enforce SpaceId Type Safety

Status: Completed

## Overview

Replace raw `string` usage for space IDs with the `SpaceId` domain type across all layers. Currently, `SpaceId` is defined and used at the repository/infrastructure boundary, but the operations layer accepts raw `string` and converts internally, and the UI layer passes `space.id` (raw string) without type safety.

## Problem

The operations method `updateSpaceEnabled(collectionId: string, spaceId: string, ...)` accepts raw strings and converts to `SpaceId` internally. The UI layer in `spaces-page.ts` passes `space.id` (raw string from the `Space` interface) directly. This means invalid space IDs would only be caught at the operations layer boundary rather than at compile time.

## Scope

Domain types, operations, infrastructure (internal helper), UI/prefs.

## Changes

### Domain Layer

#### `src/domain/layout/types.ts`

- Change `Space.id` from `string` to `SpaceId`

### Operations Layer

#### `src/operations/layout/space-collection-operations/index.ts`

- Change `updateSpaceEnabled()` `spaceId` parameter from `string` to `SpaceId`
- Remove internal `new SpaceId(spaceId)` conversion — callers now provide the typed value

### Infrastructure Layer

#### `src/infra/file/file-space-collection-repository.ts`

- Add conversion between JSON string IDs and `SpaceId` during serialization/deserialization
  - `loadCollectionsFromFile()` / `loadPresetCollections()`: Convert raw JSON `id: string` to `SpaceId` when constructing `Space`
  - `saveCollectionsToFile()`: Convert `SpaceId` to string via `toString()` before JSON serialization
- Update private `findSpace()` method: use `SpaceId` parameter and `.equals()` for comparison

### Prefs Layer

#### `src/prefs/spaces-page.ts`

- `createCollectionRow()` / button click handler: Pass `space.id` directly (now `SpaceId` from domain model)
  - `updateSpaceEnabled()` call receives `SpaceId` directly (no conversion needed)

## Estimate

- 3 points
