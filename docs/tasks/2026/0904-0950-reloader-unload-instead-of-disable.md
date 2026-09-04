---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
retries_remaining: 1
check_command: null
assignee: null
branch: task/0904-0950-reloader-unload-instead-of-disable
created_at: 2026-09-04T09:50:59Z
updated_at: 2026-09-04T11:15:00Z
---

# fix(reloader): keep the canonical extension enabled across logins by unloading instead of disabling

## Overview

`Reloader.reload()` in `src/libs/reloader/reloader.ts` stops the running
instance with `extensionManager.disableExtension(this.currentUuid)`. In GNOME
Shell 50 that API edits the `org.gnome.shell` GSettings arrays: it removes the
UUID from `enabled-extensions` and **appends it to `disabled-extensions`**.
The first reload of every session therefore leaves the canonical UUID
(`sutto@x7c1.github.io`) in `disabled-extensions`, while the instance that is
actually running lives under a temporary `<uuid>-reload-<digits>` UUID in
`/tmp`. After logout/login the temporary copy is gone (and `/tmp` is never
scanned for extensions anyway), and the canonical extension stays disabled, so
Sutto does not start at all. The developer then hits
`GDBus.Error:org.freedesktop.DBus.Error.UnknownMethod: Object does not exist at
path "/io/github/x7c1/Sutto"` from `npm run dev` and has to run
`gnome-extensions enable sutto@x7c1.github.io` by hand. Release builds are not
affected (the reloader only exists when `__DEV__` is true); this is a
development-workflow defect.

Fix: stop old instances with `extensionManager.unloadExtension(extensionObject)`
instead of `disableExtension(uuid)`. `unloadExtension` runs the same
`_callExtensionDisable` (so `disable()` executes, the D-Bus interface is
released, and the "rebase" of later extensions happens exactly as before) and
then removes the object from the manager's `_extensions` map, but it **does not
touch GSettings**. Consequences:

- The canonical UUID stays in `enabled-extensions` and never enters
  `disabled-extensions`. During the session it is not loaded (the manager no
  longer knows it), so the temporary instance is the only one running; on the
  next login GNOME Shell starts the canonical extension from
  `~/.local/share/gnome-shell/extensions/` as usual.
- Temporary reload UUIDs still accumulate in `enabled-extensions` and are still
  removed by `pruneStaleReloadUuidsFromGSettings()`, which already runs before
  `enableExtension(newUuid)`.

Concretely, in `reloader.ts`:

1. **Replace the disable step (currently around lines 80–95).** Look up the
   current extension object (`extensionManager.lookup(this.currentUuid)`), and
   abort the reload — keeping the existing spirit of the `#73` guard — when the
   object is missing or its `state` is not `ExtensionState.ACTIVE`
   (`unloadExtension` silently skips `disable()` for a non-ACTIVE extension,
   which would leave the D-Bus name held; the current code aborts when
   `disableExtension` returns `false` for the same reason). Import
   `ExtensionState` from `resource:///org/gnome/shell/misc/extensionUtils.js`
   (typed in `@girs/gnome-shell`), or if that import is not resolvable in this
   build setup, follow the file's existing pattern for `ExtensionType.PER_USER`
   (numeric literal with a comment). Then `await extensionManager.unloadExtension(extension)`.
   Rewrite the three `console.error` lines of the abort path so they describe
   the new check (state/lookup) while keeping the "logout/login required" recovery hint.
2. **`cleanupOldInstances()` (around lines 160–176)**: it currently calls
   `disableExtension(uuid)` and then `unloadExtension(extension)` for every
   other loaded `-reload-` UUID. Drop the `disableExtension` call there too so
   this path also stops writing GSettings; `unloadExtension` alone disables
   and removes the object. Keep the try/catch.
3. **Drop the trailing `unloadOldExtension(extensionManager, this.currentUuid)`
   call (around line 149) and the now-unused private method** — the old
   instance is already unloaded in step 1, so the late unload is a no-op that
   only makes the sequence harder to read. If you keep any late step, it must
   not write GSettings.
4. Update the comments in `reload()` that describe the sequence ("Disabling
   old extension...", the note above the prune call, etc.) so they match the
   new flow. Update the log line `[Reloader] Disabling old extension...` to
   say it unloads.
5. **`src/libs/reloader/prune-stale-uuids.ts` module comment**: rewrite the
   last paragraph's rationale for preserving the canonical UUID. It currently
   says the canonical one is "the seed the user re-enables after logout"; with
   this change it is simply the entry that keeps the extension starting on the
   next login. Keep the pure functions and `prune-stale-uuids.test.ts`
   unchanged.
6. Check `docs/guides/04-gnome-shell-restart.md` and
   `docs/guides/03-development-workflow.md`: if either implies a manual
   re-enable after logout, correct it; otherwise leave them alone.

Do not add any new GSettings write to the reload sequence. In particular do
not try to "repair" a canonical UUID that an earlier session already left in
`disabled-extensions` — that is a one-time manual `gnome-extensions enable`
for existing dev machines, and it is out of scope here.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `src/libs/reloader/reloader.ts` contains no call to
      `extensionManager.disableExtension(` (the reload sequence never writes
      the `org.gnome.shell` extension arrays except through the existing
      prune and `enableExtension` calls); `prune-stale-uuids.test.ts` is
      unchanged and still passes.
- [x] `npm run build && npm run check && npm run test:run` passes;
      `npm run check:strict` reports no warnings in `src/libs/reloader/`.

### Manual / on-hardware (verified by a human before merge)

- [ ] From a session where the canonical extension is running, `npm run dev`
      three times in a row: each reload logs exactly one
      `[Sutto] Extension enabled` and one `D-Bus interface registered`, and
      `journalctl -b /usr/bin/gnome-shell | grep 'already exported'` is empty.
- [ ] After those reloads, `gsettings get org.gnome.shell enabled-extensions`
      still contains `sutto@x7c1.github.io` plus only the currently running
      reload UUID, and `gsettings get org.gnome.shell disabled-extensions`
      contains no `sutto@x7c1.github.io*` entry.
- [ ] Log out and log back in: Sutto starts without any manual step
      (`gnome-extensions info sutto@x7c1.github.io` shows `Enabled: Yes` /
      `State: ACTIVE`, and `npm run dev` works immediately).

## Out of scope

- Migrating dev machines whose `disabled-extensions` already contains the
  canonical UUID from earlier sessions (run
  `gnome-extensions enable sutto@x7c1.github.io` once).
- Changing what `pruneStaleReloadUuids` considers stale, or making `Reloader`
  unit-testable.
- The release build (`__DEV__ === false` has no reloader).
