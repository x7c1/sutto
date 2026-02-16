# Improve Error Handling

## Overview

Current error handling logs to console only. Users have no visibility into failures (license API errors, file I/O errors, etc.).

## Priority

Medium

## Effort

Medium

## Category

Reliability

## Problem

Current pattern:

```typescript
} catch (e) {
  console.log(`[Sutto] ERROR: Failed to initialize: ${e}`);
  return null;
}
```

No user feedback, no retry mechanism, no structured error types.

## Proposed Actions

1. Introduce Result type for operations that can fail
   - Reference: `docs/plans/2026/18-layer-architecture-refactoring/adr-2-result-error-handling.md`

2. Add user-facing error notifications via GNOME notification system
   - License activation failures
   - Network connectivity issues

3. Implement retry mechanism for license API calls
   - Exponential backoff for transient failures

## Example Result Type

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

## Decision

- [x] Accept
- [ ] Reject
- [ ] Defer

**Notes**: Need to first identify which errors should be user-facing. Some errors are already displayed in the UI (e.g., license activation). Blanket introduction of Result type or GNOME notifications may be over-engineering.
