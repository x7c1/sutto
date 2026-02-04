# Plan 22: MonitorManager File I/O Extraction

## Overview

Extract file I/O responsibilities from `MonitorManager` into a dedicated repository class, following the same pattern established in Plan 18 (Layer Architecture Refactoring).

## Background

During the refactoring of `loadMonitorCount` (separating file reading and Gdk detection), we discovered that `MonitorManager` in `infra/monitor/` directly performs file I/O operations using `getExtensionDataPath` from `infra/file/`.

This violates the principle of single responsibility and creates inappropriate cross-dependencies within the infrastructure layer.

## Current State

`MonitorManager` (`infra/monitor/manager.ts`) has two methods that perform file I/O:

- `loadStorage()`: Loads monitor environment configuration from file
- `saveMonitors()`: Saves monitor configuration to file

Both methods use `getExtensionDataPath(MONITORS_FILE_NAME)` to access `monitors.snappa.json`.

## Problem

- `MonitorManager` has mixed responsibilities (monitor detection + file storage)
- `infra/monitor/` depends on `infra/file/` utilities
- Difficult to test monitor logic in isolation from file system

## Solution

### Create New Repository Interface

Create `MonitorEnvironmentRepository` interface in `usecase/monitor/`:

```typescript
interface MonitorEnvironmentRepository {
  load(): MonitorEnvironmentStorage | null;
  save(storage: MonitorEnvironmentStorage): void;
}
```

### Create File-based Implementation

Create `FileMonitorEnvironmentRepository` in `infra/file/`:

```typescript
class FileMonitorEnvironmentRepository implements MonitorEnvironmentRepository {
  constructor(private readonly filePath: string) {}

  load(): MonitorEnvironmentStorage | null { ... }
  save(storage: MonitorEnvironmentStorage): void { ... }
}
```

### Refactor MonitorManager

- Remove direct file I/O from `MonitorManager`
- Inject `MonitorEnvironmentRepository` as a dependency
- `MonitorManager` focuses solely on monitor detection and environment management logic

## Implementation Steps

- Create `MonitorEnvironmentRepository` interface in `usecase/monitor/`
- Create `FileMonitorEnvironmentRepository` in `infra/file/`
- Refactor `MonitorManager` to use the repository
- Update composition layer to wire dependencies
- Remove `getExtensionDataPath` import from `infra/monitor/manager.ts`
- Run build, check, and tests

## Expected Outcome

```
usecase/monitor/
  MonitorEnvironmentRepository  # Interface (port)

infra/file/
  FileMonitorEnvironmentRepository  # Implementation

infra/monitor/
  MonitorManager  # No longer imports from infra/file/
```

## Timeline

- Priority: Medium (next PR after current refactoring)
- Estimated effort: 2 points

## Related

- Plan 18: Layer Architecture Refactoring
- Current PR: feature/2026-18-layer-architecture-refactoring
