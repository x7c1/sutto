# Plan 22: MonitorEnvironment Usecase Extraction

Status: Completed

## Overview

Extract environment management responsibilities from `GnomeShellMonitorProvider` into a dedicated usecase class. The provider should only detect monitors (read-only), while a usecase orchestrates storage and business logic.

## Background

`GnomeShellMonitorProvider` has multiple responsibilities that violate layer architecture:

1. **Naming issue**: A "Provider" should only provide/read data, not save it
2. **Layer violation**: Infra component orchestrates another repository (infra calling infra)
3. **Mixed concerns**: Monitor detection + environment management + file I/O in one class

## Current State

`GnomeShellMonitorProvider` contains:

- Monitor detection (appropriate for infra)
- Environment ID generation (business logic → usecase)
- Environment change detection (business logic → usecase)
- Collection activation decision (business logic → usecase)
- File I/O via injected repository (orchestration → usecase)

## Problem

```
Controller (composition)
    └── GnomeShellMonitorProvider (infra)
            └── MonitorEnvironmentRepository (usecase interface)
```

Infra should not orchestrate repositories. That's the usecase layer's role.

## Solution

### Target Architecture

```
Controller (composition)
    └── MonitorEnvironmentUsecase (usecase)
            ├── GnomeShellMonitorProvider (infra) - monitor detection only
            └── FileMonitorEnvironmentRepository (infra) - storage only
```

### Refactor GnomeShellMonitorProvider

Remove all storage-related code. Keep only:

- `detectMonitors()`: Detect connected monitors
- `getMonitors()`, `getMonitorByKey()`, `getCurrentMonitor()`, etc.
- `connectToMonitorChanges()`, `disconnectMonitorChanges()`
- `calculateBoundingBox()`, `getMonitorsForRendering()`

Remove:

- `loadStorage()`, `saveMonitors()`
- `setActiveCollectionId()`, `getLastActiveCollectionId()`
- `getStorage()`, `getCurrentEnvironment()`, `findEnvironmentForCollection()`
- Constructor dependency on `MonitorEnvironmentRepository`

### Create MonitorEnvironmentUsecase

New usecase class that:

- Holds `MonitorEnvironmentStorage` state
- Generates environment ID from monitors
- Detects environment changes
- Determines collection to activate
- Orchestrates provider and repository

```typescript
class MonitorEnvironmentUsecase {
  constructor(
    private readonly provider: MonitorProvider,
    private readonly repository: MonitorEnvironmentRepository
  ) {}

  initialize(): void { /* load storage */ }

  detectAndSaveMonitors(): string | null { /* returns collection to activate */ }

  setActiveCollectionId(id: string): void { /* update and save */ }

  getMonitorsForRendering(displayCount: number): { ... }
}
```

## Implementation Steps

1. Create `MonitorEnvironmentUsecase` in `usecase/monitor/`
2. Move business logic from `GnomeShellMonitorProvider` to usecase
3. Simplify `GnomeShellMonitorProvider` to monitor detection only
4. Remove repository dependency from `GnomeShellMonitorProvider`
5. Update `Controller` to use `MonitorEnvironmentUsecase`
6. Run build, check, and tests

## Expected Outcome

```
usecase/monitor/
  MonitorProvider               # Interface (existing)
  MonitorEnvironmentRepository  # Interface (existing)
  MonitorEnvironmentUsecase     # New usecase class

infra/file/
  FileMonitorEnvironmentRepository  # Implementation (existing)

infra/monitor/
  GnomeShellMonitorProvider  # Monitor detection only, no repository dependency

composition/
  Controller  # Wires usecase with infra implementations
```

### Dependency Flow

```
Controller (composition)
    │
    └── MonitorEnvironmentUsecase (usecase)
            │
            ├── GnomeShellMonitorProvider (infra/monitor)
            │       └── implements MonitorProvider interface
            │
            └── FileMonitorEnvironmentRepository (infra/file)
                    └── implements MonitorEnvironmentRepository interface
```

## Related

- Plan 18: Layer Architecture Refactoring
