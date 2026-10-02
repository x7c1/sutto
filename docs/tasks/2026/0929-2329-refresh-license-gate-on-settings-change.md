---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, user-experience]
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rqE 'Gio\\.Settings|gi://Gio' src/operations/licensing/"
assignee: null
branch: task/0929-2329-refresh-license-gate-on-settings-change
created_at: 2026-09-29T14:29:06Z
updated_at: 2026-09-29T15:05:16Z
---

# fix(license): unlock the panel as soon as a license is activated in preferences

## Overview

A user whose trial has expired buys a license and activates it in the preferences window. The preferences window shows "Active", but the show-panel shortcut keeps showing the locked panel until the extension is loaded again (log out and back in). This happens at the moment the user has just paid.

The preferences window runs in its own process. Activation there writes the new license state to GSettings through `GSettingsLicenseRepository` (`src/infra/glib/license-repository.ts`), and that write is correct. The Shell process, however, decides whether to lock only from `LicenseStateHandler.disabledReason` (`src/composition/licensing/license-state-handler.ts`). That value is recomputed only when `LicenseOperations` in the Shell process calls `notifyStateChange()`, which happens during `initialize()` at enable time and after network calls made in the Shell process. Nothing in the Shell process watches the license keys in GSettings, and there is no periodic re-check, so a change written by the preferences process is never seen.

Make the Shell process follow license changes written by another process. Watch the GSettings keys that feed the license state (`license-status`, `license-key`, `license-activation-id`, `license-valid-until`, `license-last-validated`, `trial-days-used`, `trial-last-used-date`) for `changed`, and on a change recompute the disabled reason and notify state-change listeners, exactly as a Shell-side state change does today. `LicenseOperations.getDisabledReason()` already reads the repository fresh, so the recomputation needs no new logic. Put the GSettings signal handling in the infra layer behind the existing repository abstraction (for example a method on the repository that registers a change callback and returns a way to disconnect), so `operations` stays free of GSettings. Disconnect the handlers in the existing disable path. The Shell process itself writes these keys during validation. That must not start a loop: a change notification only reads state, it never writes.

Both directions must work. Activating a license unlocks the panel on the next trigger. A change that makes the license invalid (for example the status becoming `expired`) goes through the existing `onBecameInvalid` path, which locks a visible panel.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] A unit test drives `LicenseOperations` (or `LicenseStateHandler`) with a fake repository whose stored state is changed from outside and whose change callback is then fired. It asserts that after the callback `getDisabledReason()` reflects the new state (trial-expired → null after a valid license is stored, and null → a reason after the status becomes invalid), and that state-change listeners are notified
- [x] A unit test asserts that handling an external change does not write to the repository (no save calls on the fake), so the Shell's own writes cannot loop
- [x] The GSettings signal handling stays in the infra layer: `src/operations/licensing/` does not reference `Gio.Settings` or `gi://Gio` (gate appended to `check_command`)

### Manual / on-hardware (verified by a human before merge)

- [x] With an expired trial on a real GNOME Shell session, activating a license in the preferences window makes the show-panel shortcut open the normal panel right away, without logging out
  - Verified by writing the license keys with `gsettings` from a separate process, because the license API is not live yet. This covers the cross-process path the fix is about; the activation request from the preferences window itself was not exercised
- [x] Disabling the extension leaves no errors in the journal (`journalctl --user -f /usr/bin/gnome-shell`), and re-enabling it still follows license changes

## Out of scope

- Changing when or how often the Shell process validates the license with the backend
- Changing the license gate rules themselves (which states lock the panel)
- The wording of license messages
