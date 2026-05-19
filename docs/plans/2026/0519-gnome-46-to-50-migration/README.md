# Migration Plan: GNOME Shell 46 → 50 for Ubuntu 26.04

Status: Draft

## Overview

Migrate the Sutto GNOME Shell extension from **GNOME Shell 46** (Ubuntu 24.04) to **GNOME Shell 50** (Ubuntu 26.04). This is a four-version jump (46 → 47 → 48 → 49 → 50). Unlike the 42 → 46 migration (plan 001), there is no module-system rewrite required — ESM is already in place. The bulk of the work is API renames and signature changes, concentrated in Shell 49 (Mutter type split, monitor API reshape, maximize flag rework).

**Current Environment (declared):** Ubuntu 24.04 LTS + GNOME Shell 46 (what `dist/metadata.json` and `package.json` describe)
**Current Environment (host):** Ubuntu 26.04 LTS + GNOME Shell 50 (the development machine; see Phase 5 — Validation)
**Target Environment:** Ubuntu 26.04 LTS + GNOME Shell 50

## Background

### Current State

- `dist/metadata.json` declares `"shell-version": ["46"]` (single version).
- `package.json` pins `@girs/gnome-shell` at `46.0.2`, plus `@girs/clutter-14`, `@girs/meta-14`, `@girs/st-14`, `@girs/shell-14` all at `14.0.0-4.0.0-beta.12` (Mutter/Clutter/St series 14, which is the GNOME 46 series).
- Already ESM (`"type": "module"`), already uses `Extension` / `ExtensionPreferences` base classes, and `src/prefs.ts` already declares `async fillPreferencesWindow(...)` — the GNOME 47 async-prefs change is a no-op for this codebase.
- Custom type shims live under `src/libs/gnome-types/` (`st.d.ts`, `glib.d.ts`, `gio.d.ts`, `gdk4.d.ts`, `gtk4.d.ts`, `adwaita.d.ts`, `panel.d.ts`, `gjs-modules.d.ts`, `build-mode.d.ts`). There is no `gnome-shell-46.d.ts` analogue to the deleted Shell-42 file.
- `src/libs/gnome-types/panel.d.ts` still uses the legacy `declare namespace imports.ui.panel { ... }` shape (lines 5–40) plus a `Main` interface augmentation (lines 45–47) — a survivor from the pre-ESM era worth scrubbing.

### Why Migration is Necessary

Ubuntu 26.04 ships GNOME Shell 50. The current extension's `shell-version` metadata excludes 50, so GNOME will refuse to load it on the new host even if the runtime APIs happen to line up. Several APIs Sutto depends on have also changed:

- **Mutter type split (Shell 49):** `Meta.Rectangle` was removed in favor of `Mtk.Rectangle`. `Meta.Window.get_frame_rect()` now returns `Mtk.Rectangle`. `get_monitor_geometry()` and `getWorkAreaForMonitor()` return `Mtk.Rectangle` as well.
- **Monitor API reshape (Shell 49):** Several `Meta.Display.get_*_monitor*` methods have been deprecated or relocated to `Meta.MonitorManager` / `Meta.Monitor` / `Meta.LogicalMonitor`. Sutto's monitor provider depends directly on these.
- **`Meta.Window.maximize` flag signature (Shell 49):** Plain integer flags (e.g. `unmaximize(3)`) are no longer accepted; the call now takes a typed `Meta.MaximizeFlags` value. `get_maximized()` was renamed to `is_maximized()`.
- **X11-fallback removal (Shell 50):** Wayland is now mandatory in many code paths. Sutto has no X11-specific code so this is a no-op survey-wise, but it still affects compatibility metadata.

References: gjs.guide porting guides for [Shell 47](https://gjs.guide/extensions/upgrading/gnome-shell-47.html), [Shell 48](https://gjs.guide/extensions/upgrading/gnome-shell-48.html), [Shell 49](https://gjs.guide/extensions/upgrading/gnome-shell-49.html), [Shell 50](https://gjs.guide/extensions/upgrading/gnome-shell-50.html). Plan 001 (`docs/plans/2026/001-gnome-shell-46-migration/README.md`) is the precedent for this kind of work.

## Impact Analysis

Grep targets ran across `src/` only (excluding `dist/`, `node_modules/`, `site/`, `docs/`).

### Per-API Impact Table

| Release | API / pattern | Count | Files |
|---------|---------------|-------|-------|
| 47 | `Clutter.Color` → `Cogl.Color` | 0 | — |
| 47 | `getPreferencesWidget` / sync `fillPreferencesWindow` | 0 | `src/prefs.ts:12` already `async` |
| 48 | `Meta.get_window_actors` | 0 | — |
| 48 | `Meta.CursorTracker.get_for_display` | 0 | — |
| 48 | `Clutter.Image` | 0 | — |
| 48 | `vertical: true/false` literal on St widgets | 4 | `src/ui/main-panel/renderer.ts:85,179,201,251` |
| 48 | `Clutter.Stage.get_key_focus` return-handling | 0 | — |
| 49 | `Meta.Rectangle` (typed reference) | 0 | no explicit references; indirect via `get_frame_rect()` / `get_monitor_geometry()` — see notes below |
| 49 | `Meta.Window.unmaximize(flags)` integer-flag form | 1 | `src/composition/window/layout-applicator.ts:75` (`window.unmaximize(3)`) |
| 49 | `Meta.Window.maximize(...)` | 0 | — |
| 49 | `Meta.MaximizeFlags` symbolic use | 0 | needs to be **added** to replace the literal `3` above |
| 49 | `Meta.Window.get_maximized` (renamed to `is_maximized`) | 1 | `src/composition/window/layout-applicator.ts:73` |
| 49 | `Meta.Display.get_n_monitors` | 1 | `src/infra/monitor/gnome-shell-monitor-provider.ts:27` |
| 49 | `Meta.Display.get_primary_monitor` | 1 | `src/infra/monitor/gnome-shell-monitor-provider.ts:28` |
| 49 | `Meta.Display.get_monitor_geometry` | 1 | `src/infra/monitor/gnome-shell-monitor-provider.ts:35` |
| 49 | `Meta.Display.get_current_monitor` | 1 | `src/infra/monitor/gnome-shell-monitor-provider.ts:84` |
| 49 | `Meta.Display.get_monitor_index_for_rect` | 0 | — |
| 49 | `Clutter.ClickAction` / `Clutter.TapAction` | 0 | (`Gtk.GestureClick` in `src/prefs/spaces-page.ts:556` is GTK4, unaffected) |
| 49 | `WorkspaceSwitcherPopup._redisplay` | 0 | — |
| 50 | `Meta.is_wayland_compositor` / X11 / Xorg code paths | 0 | — |
| 50 | `RunDialog._restart` / `display.connect('restart', ...)` | 0 | — |
| 50 | `keyboardManager.holdKeyboard` / `releaseKeyboard` | 0 | — |

**Indirect `Mtk.Rectangle` exposure (Shell 49):** even though no explicit `Meta.Rectangle` reference exists in source, the return-type of these calls flips to `Mtk.Rectangle`:

- `src/infra/monitor/gnome-shell-monitor-provider.ts:35` — `global.display.get_monitor_geometry(i)`
- `src/infra/monitor/gnome-shell-monitor-provider.ts:36` — `Main.layoutManager.getWorkAreaForMonitor(i)`
- `src/infra/monitor/gnome-shell-monitor-provider.ts:110` — `window.get_frame_rect()`
- `src/composition/window/layout-applicator.ts:44,64-70` — work-area assignment and field dereferencing (`.x / .y / .width / .height`)
- `src/ui/main-panel/index.ts:100,115,320` — `Meta.Window` is used in 3 method signatures; downstream code may receive rect-shaped values

The `Meta.Rectangle` and `Mtk.Rectangle` interfaces are structurally identical for the four fields used here, so the code is likely to keep compiling once `@girs/mtk-*` types are present, but the **types must be imported** from the new GIR namespace.

### No-impact APIs (explicitly verified zero hits)

`Clutter.Color`, `getPreferencesWidget`, `Meta.get_window_actors`, `Meta.CursorTracker.get_for_display`, `Clutter.Image`, `Clutter.Stage.get_key_focus`, `Meta.Rectangle` (explicit reference), `Meta.MaximizeFlags`, `Meta.Window.maximize`, `Meta.Display.get_monitor_index_for_rect`, `Clutter.ClickAction`, `Clutter.TapAction`, `WorkspaceSwitcherPopup._redisplay`, `Meta.is_wayland_compositor`, X11/Xorg references, `RunDialog`, `_restart` signal, `holdKeyboard` / `releaseKeyboard`.

### Other findings

Items not covered by the table or the indirect-exposure list, but relevant to the migration:

- `global.display.set_cursor(Meta.Cursor.*)` is used in 5 places (`src/ui/components/layout-button.ts:131,142`, `src/ui/main-panel/index.ts:183`, `src/ui/main-panel/renderer.ts:146,155`). The `Meta.Cursor` enum is unchanged across 47–50, but verify on a Shell 49+ runtime that `global.display.set_cursor` still exists (it has been discussed for relocation onto the cursor tracker).
- `Meta.KeyBindingFlags.NONE` (`src/composition/shortcuts/keyboard-shortcut-manager.ts:37,60`) — stable, no impact.
- `global.display.connect('grab-op-begin' | 'grab-op-end', ...)` (`src/composition/drag/drag-signal-handler.ts:24,31`) — signals are still supported on Shell 50; no rename detected in upstream notes.

## Migration Phases

### Phase 1 — Tooling and metadata

**Goal:** Get the type system aligned with the target shell series before touching application code.

**Assumption:** the dependency bumps below happen as a single step. If Open Question 5 ("phasing of dependency bumps") is resolved otherwise, split this phase per package.

- Bump `@girs/gnome-shell` from `46.0.2` to the highest published version. As of writing, the latest published is the `49.x` series; `@girs/gnome-shell@50` is **not yet on npm**, so pin 49 and add hand-written augmentation in `src/libs/gnome-types/` only if Shell-50-specific symbols are actually consumed.
- Bump the `@girs/clutter-*`, `@girs/meta-*`, `@girs/st-*`, `@girs/shell-*`, and `@girs/cally-*` overrides from the `14.0.0-4.0.0-beta.12` (GNOME 46) series to the matching Shell-49 series (the major version moves with mutter; check the latest `4.x-beta` line). The package name suffix changes with the series (`-14` for GNOME 46 → likely `-16` or `-17` for Shell 49); update both the dependency keys in `devDependencies` and the matching keys in the `overrides` block of `package.json`.
- Add `@girs/mtk-*` (introduced for Shell 49) so `Mtk.Rectangle` resolves. The npm package name includes the GIR version suffix (e.g., `@girs/mtk-16`); pick the one that matches the chosen `@girs/meta-*` series.
- Run `npm install` and commit the updated `package-lock.json` alongside the manifest changes.
- Update `dist/metadata.json`:
  - `"shell-version"` — two options to decide in **Open Questions** below:
    - Recommended: `["49", "50"]` (drop 46–48 — anyone on those is already past LTS for Sutto's use case)
    - Conservative: `["46", "47", "48", "49", "50"]` (maintain dual-target; requires runtime conditionals)
  - `"version"` — bump from `6` to `7` (GNOME extension registry expects monotonic integer; required for a re-release).
- Confirm `npm run build && npm run check && npm run test:run` still passes with the new types in place. Type errors are expected at this point and will be resolved in subsequent phases.

### Phase 2 — Shell 47 / 48 mechanical changes

**Goal:** Apply the easy, mostly-find-and-replace updates.

- `src/ui/main-panel/renderer.ts:85,179,201,251` — replace `vertical: true/false` literal property with `orientation: Clutter.Orientation.VERTICAL` / `Clutter.Orientation.HORIZONTAL`. Note: `renderer.ts` imports `Meta` and `St` but **not** `Clutter`, so a new `import Clutter from 'gi://Clutter';` will need to be added at the top of the file.
- No `Clutter.Color`, `Clutter.Image`, `Meta.get_window_actors`, or `CursorTracker` usage was found, so the rest of phase 2 is a verification pass: re-run the grep targets after dependency bumps to catch any newly-surfaced deprecation warnings.

**Verification:** `npm run build && npm run check && npm run test:run` clean.

### Phase 3 — Shell 49 changes (the bulk of the work)

**Goal:** Adapt to Mutter type split, monitor API reshape, and maximize signature change.

**3a. Maximize flags (`src/composition/window/layout-applicator.ts`):**

- Line 73: `window.get_maximized()` → `window.is_maximized()` (boolean accessor).
- Line 75: `window.unmaximize(3)` → `window.unmaximize(Meta.MaximizeFlags.BOTH)` (or `HORIZONTAL | VERTICAL`). Drop the inline integer literal — it's already a code smell.

**3b. Mtk.Rectangle types (`src/infra/monitor/gnome-shell-monitor-provider.ts`, `src/composition/window/layout-applicator.ts`):**

- Import `Mtk` (`import type Mtk from 'gi://Mtk'`) where rectangles are dereferenced.
- The codebase does not currently declare any `Meta.Rectangle` annotations, but this migration is a good moment to add explicit `Mtk.Rectangle` annotations to the rect-returning helpers in the monitor provider so the type boundary is visible at the API edge.
- The `.x / .y / .width / .height` field accesses are unchanged, so most call sites compile as-is.

**3c. Monitor API migration (`src/infra/monitor/gnome-shell-monitor-provider.ts`):**

- Audit each `global.display.get_*` call against the Shell 49 release notes:
  - Line 27 `get_n_monitors()` → if relocated, prefer `Main.layoutManager.monitors.length` or `global.backend.get_monitor_manager().get_monitors().length` depending on the upstream resolution.
  - Line 28 `get_primary_monitor()` → likely `Main.layoutManager.primaryIndex` or a `MonitorManager` accessor.
  - Line 35 `get_monitor_geometry(i)` → either keep via the new `Meta.Monitor` object or use `Main.layoutManager.monitors[i]` (which already exposes geometry-shaped fields).
  - Line 84 `get_current_monitor()` → typically `global.display.get_current_monitor()` still works on Shell 49 but check the notes.
- Encapsulate the migration **inside `GnomeShellMonitorProvider`** so that the rest of the codebase (which consumes the `MonitorProvider` interface) does not change.

**Verification:** `npm run build && npm run check && npm run test:run` clean. Smoke-test on the host (Shell 50 — see Phase 5).

### Phase 4 — Shell 50 changes

**Goal:** Close any remaining gaps and clear up residual legacy artefacts.

- No X11 / `is_wayland_compositor` / restart-signal / `holdKeyboard` references were found, so this phase is mostly housekeeping:
  - Update `dist/metadata.json` `"shell-version"` to include `"50"` if not already done in Phase 1.
  - **Conditional on Open Question 4:** remove the legacy `declare namespace imports.ui.panel` block and the `Main` interface augmentation in `src/libs/gnome-types/panel.d.ts` (lines 5–40 and 45–47), and migrate any consumer to typed shell-extension imports. If Open Question 4 is resolved as "split into a separate cleanup PR", skip this step.
- If the dependency bump in Phase 1 only reached Shell 49 types, add a small `src/libs/gnome-types/gnome-shell-50.d.ts` augmentation file for Shell-50-only symbols that the code actually references (likely none, given the survey).

### Phase 5 — Validation

**Goal:** Verify the migrated extension runs cleanly on the Shell 50 host.

The dev machine is already on Shell 50, so primary validation happens there. Backward-compat to Shell 46–48 cannot be exercised on this host and requires a separate VM if the conservative `shell-version` range was retained in Phase 1.

- Clean checks: `npm run build && npm run check && npm run test:run` (canonical command from CLAUDE.md). Also run `npm run check:strict` to catch new biome warnings from the dependency bump.
- Manual install on the Ubuntu 26.04 host (Shell 50):
  - `npm run dev` to build, copy, and reload via D-Bus.
  - Smoke-test the canonical user journeys: drag-to-edge → panel appears, layout button click → window snaps (covers `is_maximized` / `unmaximize` rework), multi-monitor layout selection (covers the monitor-provider rework), keyboard navigation, preferences window opens.
  - Tail logs: `journalctl -f /usr/bin/gnome-shell | grep -i sutto`.
- Optional Ubuntu 24.04 + Shell 46 VM regression check, only if Phase 1 chose the conservative `shell-version` range. Skip otherwise — claiming support for an untested range is worse than dropping it.

## Success Criteria

- [ ] `npm run build && npm run check && npm run test:run` passes cleanly with the bumped `@girs/*` dependencies.
- [ ] `npm run check:strict` (biome `--error-on-warnings`) also passes, confirming no new deprecation warnings were introduced.
- [ ] Extension installs and enables on Ubuntu 26.04 + GNOME Shell 50 (`gnome-extensions enable sutto@x7c1.github.io`).
- [ ] All canonical user journeys work on the Shell 50 host: drag-to-edge → panel appears, layout button click → window snaps, multi-monitor layout selection, keyboard navigation, preferences window opens.
- [ ] No errors in `journalctl -f /usr/bin/gnome-shell | grep -i sutto` during normal operation.
- [ ] `dist/metadata.json` `"shell-version"` matches the agreed strategy (drop or maintain) and `"version"` is incremented.
- [ ] All `@girs/*` overrides resolve to the chosen series and `package-lock.json` is committed.

## Rollback Plan

If critical regressions surface during validation:

- Revert the migration commits on `main` (the entire branch is the unit of rollback; partial revert is unsafe because dependency bumps and code changes are coupled).
- The previous extension build on the Shell 46 metadata is still usable on Ubuntu 24.04. Users on the Shell 50 host can fall back to the previous `dist/` artifacts if they pinned the release tag.
- Document the failure mode in this plan's "Other findings" before re-attempting, so the second attempt does not rediscover the same blocker.

## Open Questions

1. **Drop support for GNOME Shell 46/47/48, or maintain dual-target?**
   - Drop: simpler code, smaller `shell-version` array, no runtime conditionals. Loses Ubuntu 24.04 LTS users.
   - Maintain: needs runtime conditionals around `is_maximized` vs `get_maximized`, the monitor API, and any `Mtk` vs `Meta.Rectangle` usage. More effort, broader audience.
2. **Pin `@girs/gnome-shell@49` and augment for Shell 50, or wait for the `@girs/gnome-shell@50` npm release?**
   - The survey shows no Shell-50-only API consumed, so 49 + a thin augmentation should be sufficient today.
3. **Are `Meta.Cursor.*` and `global.display.set_cursor(...)` still the recommended way to drive the cursor on Shell 50?** Upstream has discussed moving cursor control to the backend. Confirm before relying on the five existing call sites.
4. **Should the legacy `declare namespace imports.ui.panel` in `src/libs/gnome-types/panel.d.ts` be deleted as part of this plan, or split into a separate cleanup PR?** It is unrelated to Shell 50 but is a clear pre-ESM survivor.
5. **Phasing of dependency bumps:** bump all `@girs/*` packages together in Phase 1, or stage them per phase to minimise blast radius?

## References

### Official porting guides

- [Port Extensions to GNOME Shell 47 | GJS Guide](https://gjs.guide/extensions/upgrading/gnome-shell-47.html)
- [Port Extensions to GNOME Shell 48 | GJS Guide](https://gjs.guide/extensions/upgrading/gnome-shell-48.html)
- [Port Extensions to GNOME Shell 49 | GJS Guide](https://gjs.guide/extensions/upgrading/gnome-shell-49.html)
- [Port Extensions to GNOME Shell 50 | GJS Guide](https://gjs.guide/extensions/upgrading/gnome-shell-50.html)

### Release notes

- [GNOME 47 Release Notes](https://release.gnome.org/47/)
- [GNOME 48 Release Notes](https://release.gnome.org/48/)
- [GNOME 49 Release Notes](https://release.gnome.org/49/)
- [GNOME 50 Release Notes](https://release.gnome.org/50/)

### Package documentation

- [@girs/gnome-shell - npm](https://www.npmjs.com/package/@girs/gnome-shell)
- [@girs/mtk - npm](https://www.npmjs.com/package/@girs/mtk-16) (Mtk types, introduced for Shell 49)

### Internal precedent

- `docs/plans/2026/001-gnome-shell-46-migration/README.md` — the 42 → 46 migration plan, completed. Provides the structural precedent (phased rollout, per-API impact table, validation criteria).

## Next Steps

1. User review of this draft, especially the **Open Questions** section.
2. Decide the `shell-version` strategy (drop vs. maintain) — this gates Phase 1.
3. Begin Phase 1 once decisions are made.
