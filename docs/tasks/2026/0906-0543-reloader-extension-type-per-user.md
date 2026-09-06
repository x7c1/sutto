---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
retries_remaining: 1
check_command: null
assignee: null
branch: task/0906-0543-reloader-extension-type-per-user
created_at: 2026-09-06T05:43:23Z
updated_at: 2026-09-06T06:22:00Z
---

# fix(reloader): register reload copies as PER_USER extensions

## Overview

`Reloader.reload()` in `src/libs/reloader/reloader.ts` creates the temporary
extension object with

```ts
extensionManager.createExtensionObject(
  newUuid,
  tmpDirFile,
  1 // ExtensionType.PER_USER
);
```

The comment says `PER_USER`, but GNOME Shell 50's
`resource:///org/gnome/shell/misc/extensionUtils.js` exports
`ExtensionType = { SYSTEM: 1, PER_USER: 2 }`, so the literal `1` actually
registers the reload copy as a **system** extension. The copy lives under
`/tmp`, is owned by the user, and is created by the user's own dev tooling, so
`PER_USER` is the truthful type. In GNOME Shell 50 the type decides whether
the extension can be uninstalled and auto-updated (`PER_USER` only) and
whether `unloadExtension()` records the version in `_unloadedExtensions`
(`PER_USER` + imported only). None of that matters for a throwaway reload UUID,
which is why the mismatch was harmless, but the value and the comment
contradict each other and the Extensions app shows reload instances as
"system" extensions.

Fix: stop hand-writing the number. `@girs/gnome-shell` declares
`enum ExtensionType { SYSTEM = 1, PER_USER = 2 }` in
`dist/misc/extensionUtils.d.ts`, matching the runtime names and values (unlike
`ExtensionState`, whose member names drifted — see the `EXTENSION_STATE_ACTIVE`
docblock in the same file; do not touch that constant). Import `ExtensionType`
from `resource:///org/gnome/shell/misc/extensionUtils.js` (the esbuild config
already treats `resource://*` as external, and `reloader.ts` already imports
from `resource:///org/gnome/shell/ui/main.js`) and pass
`ExtensionType.PER_USER`. Drop the numeric literal and its comment. While
there, fix the stale comment above the call ("Create extension object (returns
void in Shell 46)") so it does not name a Shell version this code no longer
targets; say what the call does and, if worth keeping, that it returns nothing
so the object is fetched with `lookup()` right after.

If the `EXTENSION_STATE_ACTIVE` docblock's rationale ("the enum's member names
drifted") reads as if it applied to every enum in that module, add a short
clause making clear it is specific to `ExtensionState`; otherwise leave it.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `src/libs/reloader/reloader.ts` passes `ExtensionType.PER_USER`
      (imported from `resource:///org/gnome/shell/misc/extensionUtils.js`) to
      `createExtensionObject`, and contains no numeric literal `1` with an
      `ExtensionType` comment.
- [x] `npm run build && npm run check && npm run test:run` passes;
      `npm run check:strict` reports no warnings in `src/libs/reloader/`.

### Manual / on-hardware (verified by a human before merge)

- [ ] `npm run dev` twice in a row: each reload logs exactly one
      `[Sutto] Extension enabled` and no `already exported`; the extension keeps
      working after both reloads.
- [ ] `gnome-extensions info <current reload UUID>` (take the UUID from
      `gnome-extensions list --enabled | grep sutto`) reports `Type: User`
      instead of `System`.

## Out of scope

- Changing `EXTENSION_STATE_ACTIVE` or how `ExtensionState` is referenced.
- Any behavioural change to the reload sequence beyond the type value.
