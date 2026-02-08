# Improve Error Handling

Status: Draft

## Overview

Add user-facing error notifications for critical failures using the GNOME Shell notification system. Currently, 41 catch blocks exist in the codebase, but only license UI errors are visible to users — all other errors are silently logged to console. This plan focuses on surfacing important errors that affect user operations, while keeping infrastructure-level errors silent. Also includes a research ADR on error telemetry (server-side error collection) for future consideration.

## Background

The codebase follows the exception-based error handling strategy decided in ADR-2 (`docs/plans/2026/18-layer-architecture-refactoring/adr-2-result-error-handling.md`). Domain and infrastructure layers throw typed exceptions (`LicenseApiError`, `NetworkError`, `BackendUnreachableError`, validation errors), and the UI layer uses try-catch.

However, the current notification gap means:
- File I/O failures (history, collections, monitor config) are completely invisible
- Keyboard shortcut registration failures go unnoticed
- Users may experience broken functionality without understanding why

## Scope

### In Scope
- Add GNOME Shell notifications (`Main.notify` / `Main.notifyError`) for user-impacting errors
- Create a notification service abstraction in the infra layer
- Integrate notifications at key error points in composition and UI layers
- Research ADR on error telemetry approach

### Out of Scope
- Result type introduction (rejected per ADR-2)
- Retry mechanisms (license API already handles retries in UI)
- Error telemetry implementation (research only in this plan)
- Changing existing error handling strategy

## Technical Approach

### Notification Service

Create a `NotificationService` interface in the operations layer and a GNOME Shell implementation in the infra layer:

```typescript
// operations layer - interface
interface NotificationService {
  notifyError(title: string, details?: string): void;
  notifyWarning(title: string, details?: string): void;
}

// infra layer - implementation
class GnomeNotificationService implements NotificationService {
  notifyError(title: string, details?: string): void {
    Main.notifyError(`Snappa: ${title}`, details ?? '');
  }
  notifyWarning(title: string, details?: string): void {
    Main.notify(`Snappa: ${title}`, details ?? '');
  }
}
```

### Error Categories and Notification Strategy

| Error Category | Current Behavior | Proposed Behavior |
|---|---|---|
| License API errors (activation/validation) | Shown in preferences UI | Keep as-is (already user-facing) |
| File I/O write failures (history, collections) | Silent log | `notifyWarning` — data may not be saved |
| File I/O read failures (corrupted data) | Silent log, return default | `notifyWarning` — settings may have been reset |
| Keyboard shortcut registration failure | Silent log | `notifyWarning` — shortcut won't work |
| Monitor detection failure | Silent log | No notification (graceful degradation is acceptable) |
| D-Bus / reloader errors | Silent log | No notification (developer-only concern) |
| Extension initialization failure | Silent log | `notifyError` — extension may not work |
| GSettings load failure | Silent log | `notifyError` — preferences may not load |

### Integration Points

Notifications will be added at the **composition layer** (where dependencies are wired) and **entry points** (extension.ts, prefs.ts), not deep inside infrastructure code. This keeps the infra layer focused on I/O and avoids coupling to notification mechanisms.

Key files to modify:
- `src/extension.ts` — initialization failures
- `src/prefs.ts` — settings load failure
- `src/composition/shortcuts/keyboard-shortcut-manager.ts` — shortcut registration failure
- `src/prefs/preferences.ts` — collection/preset loading failures
- `src/infra/file/file-layout-history-repository.ts` — history write failures
- `src/infra/file/file-space-collection-repository.ts` — collection save failures

### Error Telemetry (Research ADR Only)

Research and document options for collecting errors server-side:
- What data to collect (error type, stack trace, extension version, GNOME Shell version)
- Privacy considerations (opt-in, anonymization, GDPR)
- Transport mechanism (existing license API server vs. dedicated endpoint)
- Storage and alerting approach
- Whether GNOME extension ecosystem has conventions for this

This will be documented as an ADR for future implementation decision.

## Tasks

- Create `NotificationService` interface and `GnomeNotificationService` implementation
- Wire `NotificationService` into composition layer
- Add `notifyError` for extension initialization failures in `extension.ts`
- Add `notifyError` for GSettings load failure in `prefs.ts`
- Add `notifyWarning` for keyboard shortcut registration failures
- Add `notifyWarning` for file I/O write failures (history, collections)
- Add `notifyWarning` for collection/preset loading failures in preferences
- Write ADR for error telemetry research
- Run `npm run build && npm run check && npm run test:run` to verify
