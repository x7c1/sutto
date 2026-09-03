---
status: completed
pipeline_phase: null
plan: docs/plans/2026/0617-license-expiry-feedback
base_ref: null
blocked_by: []
subagent_type: general-purpose
retries_remaining: 1
check_command: null
assignee: null
branch: task/0617-1423-license-expiry-feedback
created_at: 2026-06-17T14:23:39Z
updated_at: 2026-09-03T18:52:00Z
---

# feat(licensing): surface license expiry instead of failing silently

## Overview

Implement the design in `docs/plans/2026/0617-license-expiry-feedback/README.md`.

Today, when the license is invalid (trial ended, `expired`/`invalid`, or the
offline grace period exceeded), the Controller gates every panel-show path on
`LicenseStateHandler.isValid()` and returns early with only a `log()` line, so
dragging a window to a screen edge or pressing the show-panel shortcut does
nothing and the user gets no explanation (`src/composition/controller.ts`:
`showMainPanel()`, `onShowPanelShortcut()`, and the `enable()` `onBecameInvalid`
callback).

Two surfaces, per the plan's **Settled decisions**:

1. **Locked panel on the failing trigger (primary).** Instead of suppressing the
   gesture, render the Main Panel in a locked "license required" state with a
   reason-specific message and (where applicable) an "Open Preferences" button.
   The locked panel reuses the normal panel's show/positioning/auto-hide
   lifecycle — no bespoke dismissal logic.
2. **Pre-expiry trial warning (proactive).** While in trial, fire a GNOME Shell
   notification when `trialDaysRemaining` first crosses 3 days and 1 day.

Key implementation points fixed by the plan:

- Add `DisabledReason = 'trial-expired' | 'license-expired' | 'license-invalid' |
  'offline-grace-exceeded'` and `LicenseOperations.getDisabledReason(): DisabledReason | null`
  (`null` = enabled) as the single source of truth; reimplement
  `shouldExtensionBeEnabled()` as `getDisabledReason() === null`. Expose the
  reason through `LicenseStateHandler`.
- Add `MainPanel.showLocked(reason)` alongside `show(cursor, window)`, reusing the
  existing lifecycle; add a locked-state variant to
  `src/ui/main-panel/renderer.ts`.
- Wire `showMainPanel()` and `onShowPanelShortcut()` to call `showLocked(reason)`
  instead of returning; on the runtime `onBecameInvalid` transition, switch a
  visible panel to the locked state and leave a hidden panel hidden.
- Wire an `onOpenPreferences` callback from `src/extension.ts` (which holds the
  `Extension` instance) to the locked panel's button, calling
  `Extension.openPreferences()`.
- Add a minimal `NotificationService` (operations-layer interface + GNOME-Shell
  infra implementation), interface aligned with plan 028
  (`docs/plans/2026/028-improve-error-handling`); used only for the pre-expiry
  warning.
- Add a `trial-warning-last-threshold` key to
  `org.gnome.shell.extensions.sutto.gschema.xml` (int, default `0` = none warned)
  so each threshold fires at most once and re-login does not re-fire; reset on
  activation. Check thresholds on `enable()`/startup only.

Final user-facing copy (see the plan's reason table):

- `trial-expired`: "Your Sutto trial has ended. Activate a license to keep snapping windows." (Open Preferences)
- `license-expired`: "Your Sutto license has expired. Re-activate it to continue." (Open Preferences)
- `license-invalid`: "Your Sutto license is no longer valid. Re-activate it to continue." (Open Preferences)
- `offline-grace-exceeded`: "Sutto couldn't verify your license. Reconnect to the internet to continue." (no action button)
- Pre-expiry warning: "Your Sutto trial ends in {n} day(s). Activate a license to keep using it." (`{n}` = 3 or 1, correct singular/plural)

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `LicenseOperations.getDisabledReason()` returns the correct `DisabledReason`
      for each invalid case and `null` when the extension should be enabled;
      `shouldExtensionBeEnabled()` is implemented in terms of it. Covered by unit
      tests for all four reasons plus the `null` case.
- [x] A reason→message helper maps each `DisabledReason` to its final copy string
      and whether an "Open Preferences" action applies; unit tests assert the exact
      strings and action applicability per reason.
- [x] Pre-expiry warning threshold logic is unit-tested: fires once when crossing
      3 days and once when crossing 1 day, does not re-fire on repeated evaluation
      at the same threshold, and resets when the status leaves `trial`.
- [x] `npm run build && npm run check && npm run test:run` passes.

### Manual / on-hardware (verified by a human before merge)

- [ ] With `license-status` set to `expired` via `dconf`, dragging a window to a
      screen edge shows the Main Panel in the locked state with the
      `license-expired` message and an "Open Preferences" button.
- [ ] Clicking "Open Preferences" opens the extension preferences window.
- [ ] The locked panel auto-hides on cursor leave, identical to the normal panel.
- [ ] The show-panel keyboard shortcut also shows the locked panel while invalid.
- [ ] The pre-expiry warning notification appears at 3 days and at 1 day remaining
      (simulate via `trial-days-used`), and does not repeat on re-login.

## Out of scope

- A persistent top-bar indicator and a preferences-page status banner (deferred in
  the plan).
- Changing license validation logic, trial length, or grace-period rules.
- Changing the license activation flow itself (the preferences License UI already
  handles activation).
- General error notifications unrelated to licensing (plan 028).
