# Plan 29: Enforce ID Type Safety

Status: Completed

## Overview

Replace raw `string` usage for domain IDs with their corresponding domain types (`CollectionId`, `SpaceId`, `LayoutId`) across all layers. This ensures compile-time type safety and prevents runtime crashes caused by invalid ID values flowing through the system undetected.

## Problem

The codebase defines domain ID types (`CollectionId`, `SpaceId`, `LayoutId`) that validate UUID format, but operations and UI layers pass these IDs as raw `string`. This creates a type safety gap where invalid values can flow through the system until they reach a point where the domain type is finally constructed, causing runtime errors.

A concrete example: `MonitorEnvironmentOperations.getDefaultCollectionId()` generates non-UUID strings (`preset-N-monitor`) that pass through as raw strings but crash when `CollectionId` is eventually constructed.

## Approach

Each domain ID type is addressed in a separate sub-plan. The pattern is consistent across all three:

- Change domain model interfaces to use the domain ID type instead of `string`
- Update operations layer signatures to accept/return domain ID types
- Move ID construction to system boundaries (file loading, GSettings reading)
- Remove internal `new XxxId(string)` conversions in operations methods
- Use `.equals()` for comparisons instead of `===` on raw strings

## Sub-Plans

- [1-collection-id](plans/1-collection-id/README.md) — Enforce `CollectionId` type safety (8 points)
- [2-space-id](plans/2-space-id/README.md) — Enforce `SpaceId` type safety (3 points)
- [3-layout-id](plans/3-layout-id/README.md) — Enforce `LayoutId` type safety (5 points)

## Estimate

- Total: 16 points (sum of sub-plans)
