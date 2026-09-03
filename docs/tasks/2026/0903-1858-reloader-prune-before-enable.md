---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
retries_remaining: 1
check_command: null
assignee: null
branch: task/0903-1858-reloader-prune-before-enable
created_at: 2026-09-03T18:58:56Z
updated_at: 2026-09-03T19:36:00Z
---

# fix(reloader): prune stale reload UUIDs before enabling the new instance

## Overview

`Reloader.reload()` in `src/libs/reloader/reloader.ts` currently calls
`extensionManager.enableExtension(newUuid)` and then, immediately afterwards,
`this.pruneStaleReloadUuidsFromGSettings(newUuid)`. On a session where a stale
`<uuid>-reload-<digits>` entry exists (every reload after the first one, because
`disableExtension(old)` has just appended the old reload UUID to
`disabled-extensions`), the prune performs a second write to
`org.gnome.shell` `disabled-extensions` while GNOME Shell is still processing
the first one.

GNOME Shell 50's `ExtensionManager._onEnabledExtensionsChanged()` is `async` and
only updates `this._enabledExtensions` at its end. The first write starts
`_callExtensionEnable(newUuid)`, which awaits the dynamic `import()` of
`extension.js`. The second write fires another `_onEnabledExtensionsChanged()`
that still sees the new UUID as "not yet enabled", enters
`_callExtensionEnable(newUuid)` too, and — because `extension.state` stays
`INITIALIZED` until the import resolves — also runs `_callExtensionInit`. Both
calls then construct `new SuttoExtension(...)` and call `enable()`, so the
journal shows `[Sutto] Extension enabled` twice, the second `DBusReloader`
registration fails with `An object is already exported for the interface
io.github.x7c1.Sutto`, and the first instance is orphaned: it keeps its
`Controller` and the D-Bus object alive with no reference from the extension
manager. The next `npm run reload` reaches that orphan, cannot register the
new instance's D-Bus object, and eventually aborts with the
"logout/login required" message. The race is timing-dependent (it does not
reproduce on every reload) but the mechanism is deterministic.

Fix: move the `pruneStaleReloadUuidsFromGSettings(newUuid)` call so it runs
**before** `extensionManager.enableExtension(newUuid)` (after
`loadExtension(newExtension)` is fine). At that point the new UUID is in
neither GSettings array, so the prune's write triggers an
`_onEnabledExtensionsChanged()` that has nothing to enable or disable and
completes synchronously; the subsequent `enableExtension` write is then the
only in-flight enable. `pruneStaleReloadUuids()` already preserves
`currentUuid` explicitly, so running it before the enable cannot prune the
new instance — update the comment above the call (currently "Must run AFTER
the new UUID has been enabled so we never accidentally prune ourselves") to
state the real constraint: the prune must not write GSettings while the
enable of the new UUID is in flight. Keep the pure helper in
`prune-stale-uuids.ts` and its tests unchanged.

Also update `src/libs/reloader/reloader.ts`'s ordering-related comments if any
other line still describes the old order. No other behaviour of the reloader
(disable-first, 100 ms waits, temp-dir cleanup, old-instance unload) changes.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `src/libs/reloader/prune-stale-uuids.test.ts` is unchanged and still
      passes: the pure `pruneStaleReloadUuids` / `pruneStaleReloadUuidsFromSettings`
      contract (preserve the base UUID and `currentUuid`, write back only on
      change) is not modified by this fix.
- [x] `npm run build && npm run check && npm run test:run` passes with the
      reordered `reload()`; `npm run check:strict` reports no new warnings in
      `src/libs/reloader/`.

### Manual / on-hardware (verified by a human before merge)

- [ ] Starting from a freshly logged-in GNOME session with the extension
      enabled, run `npm run dev` three times in a row. Each reload logs exactly
      one `[Sutto] Extension enabled` and one `D-Bus interface registered`, and
      `journalctl /usr/bin/gnome-shell | grep 'already exported'` stays empty.
- [ ] After those reloads, `gsettings get org.gnome.shell disabled-extensions`
      contains no `sutto@x7c1.github.io-reload-<digits>` entry other than none
      (stale entries are still pruned), and `enabled-extensions` contains only
      the currently running reload UUID for sutto.

## Out of scope

- Making `Reloader` itself unit-testable (injecting the extension manager);
  the reorder is the whole fix.
- Recovering an already-orphaned instance in a running session (logout/login
  remains the recovery path, as the reloader's own error message states).
- Changing what `pruneStaleReloadUuids` considers stale.
