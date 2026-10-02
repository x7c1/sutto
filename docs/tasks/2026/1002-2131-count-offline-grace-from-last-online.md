---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && grep -q 'name=\"last-online-at\"' dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml && ! grep -rq 'daysSinceLastValidation' src/operations/"
assignee: null
branch: task/1002-2131-count-offline-grace-from-last-online
created_at: 2026-10-02T12:31:48Z
updated_at: 2026-10-02T12:45:20Z
---

# fix(license): count the offline grace period from the last time the device was online

## Overview

A valid license keeps working offline for 7 days (`OFFLINE_GRACE_PERIOD_DAYS` in `src/domain/licensing/license-state.ts`). Today those 7 days are counted from the last successful validation (`license-last-validated`, read through `License.daysSinceLastValidation()`). If the license server stops answering, that timestamp never moves again: a device that stays online keeps working, but the first time it goes offline after 7 days it is locked at once. The extension must keep working when the license server is gone, so the grace period has to be counted from the last time the device itself was online, whether or not the server answered.

- Add a GSettings key `last-online-at` (int64, Unix seconds, default 0) to `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml`, and read and write it through `LicenseRepository` (`src/operations/licensing/license-repository.ts`, implemented in `src/infra/glib/license-repository.ts`). Do not add it to the keys `watchChanges` follows: it does not decide anything another process writes, and the Shell writes it often.
- Record "now" in `last-online-at` whenever the device is seen online: at startup (`LicenseOperations.initialize()`), when the network comes back (follow `Gio.NetworkMonitor`'s `network-changed` signal in the infra layer, behind `NetworkStateProvider` or a sibling abstraction, and stop following it in the existing dispose path), and in `LicenseStateHandler.recordPanelUse()` when the panel is opened. Writing it is not a license change and must not notify state-change listeners.
- `getDisabledReason()` for a `valid` license: enabled while online; while offline, enabled until 7 days have passed since `last-online-at`, then `offline-grace-exceeded`. The live network state decides only whether the offline branch applies; the server's last answer plays no part.
- Do not attempt validation while offline. In `initialize()`, validate a `valid` license only when the device is online.
- A missing or zero `last-online-at` (every existing installation, and any broken value) counts as "now": write the current time and never lock because of it.
- `LicenseState` exposes days since the device was last online instead of days since the last validation, and `getLicenseStatusDisplay` uses it for "Offline - connect within N days" (`src/domain/licensing/license-status-display.ts`). Keep `license-last-validated` and `License.lastValidated` as they are: they still record the last successful validation.

Out of scope: trials. A trial in progress is local and never locks for being offline. What an ended trial does offline is part of a later change.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml` defines `last-online-at` (grep gate in `check_command`)
- [x] Unit tests for `getDisabledReason()` with a `valid` license: online with `last-online-at` 30 days ago → enabled; offline 6 days after `last-online-at` → enabled; offline 7 days after → `offline-grace-exceeded`; offline with `last-validated` 30 days ago but `last-online-at` 1 day ago → enabled
- [x] Unit tests assert that `initialize()` records `last-online-at` when online and leaves it unchanged when offline, and that it calls the API client's `validate` only when online
- [x] A unit test asserts that `recordPanelUse()` records `last-online-at` when online
- [x] A unit test asserts that a zero `last-online-at` is treated as now: offline with zero → enabled, and the current time is stored
- [x] A unit test asserts that recording `last-online-at` does not notify state-change listeners
- [x] A unit test asserts the "Offline - connect within N days" subtitle counts from `last-online-at`
- [x] `src/operations/` no longer reads `daysSinceLastValidation` (grep gate in `check_command`)
