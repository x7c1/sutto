# Expand Test Coverage

## Overview

Tests are concentrated in the domain layer. The operations and composition layers have minimal test coverage, leaving critical business logic untested.

## Priority

High

## Effort

Medium

## Category

Quality

## Problem

Current test coverage is limited to domain layer only.

| Layer | Test Files | Notes |
|-------|------------|-------|
| domain | 11 | licensing, layout-expression, history |
| operations | 0 | Business logic untested |
| composition | 0 | Integration untested |
| ui | 0 | N/A (GNOME Shell dependent) |
| infra | 1 | Serializer only |

## Proposed Actions

1. Add unit tests for `LicenseOperations` (activation, validation, trial logic)
2. Add unit tests for `MonitorEnvironmentOperations`
3. Add tests for `LayoutApplicator` behavior
4. Create mock implementations for infra interfaces to enable operations testing

## Target Files

- `src/operations/licensing/license-operations.ts`
- `src/operations/monitor/monitor-environment-operations.ts`
- `src/composition/window/layout-applicator.ts`

## Decision

- [x] Accept
- [ ] Reject
- [ ] Defer

**Notes**: Scope narrowed to license validation logic only (`LicenseOperations`). Other layers (MonitorEnvironmentOperations, LayoutApplicator) are out of scope - testing cost outweighs benefit for thin wrappers and simple delegation code.
