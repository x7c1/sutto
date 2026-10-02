---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rq 'handleTrialStartup' src/ && [ \"$(grep -rho 'licenseStateHandler.recordPanelUse()' src/composition/ | wc -l)\" -ge 2 ]"
assignee: null
branch: task/1002-2104-count-trial-days-on-panel-use
created_at: 2026-10-02T12:04:28Z
updated_at: 2026-10-02T12:19:28Z
---

# fix(license): count a trial day when the panel is shown, not when the extension is enabled

## Overview

The [Trial Period](../../concepts/trial-period/README.md) counts the days the user actually uses sutto, at most one per calendar day. Today a day is recorded only when the extension is enabled: `LicenseOperations.initialize()` calls `handleTrialStartup()`, which calls `recordTrialUsage()` (`src/operations/licensing/license-operations.ts`). On GNOME Shell "enabled" means login, screen unlock, or an extension reload. A user who stays logged in without locking the screen never advances the count, and a user who unlocks the screen but never opens the panel has the day counted anyway.

Count a day when the user opens the normal main panel instead.

- Add `LicenseStateHandler.recordPanelUse()` (`src/composition/licensing/license-state-handler.ts`). When the stored status is `trial`, it records today's usage through `LicenseOperations.recordTrialUsage()`. When a new day was recorded, it runs `TrialWarningOperations.checkAndNotify()` so the pre-expiry warning fires as soon as a threshold is crossed. For any other status it does nothing. After the call, `getDisabledReason()` must reflect the recorded day (the state-change notification already recomputes it synchronously).
- Call it from both places in `src/composition/controller.ts` that open the main panel: `showMainPanel()` (edge trigger) and `togglePanelForFocusedWindow()` (keyboard shortcut and top bar indicator). Call it after the "panel already visible" early return and before the panel reads `getDisabledReason()`. Recording first means the day that reaches the limit locks the panel at that same trigger, which matches the existing rule that the trial ends when the 30th day is recorded.
- Stop recording at enable time: remove `handleTrialStartup()` and its call from `initialize()`. This also removes its `backend_unreachable` guard; trial days are local and count regardless of the backend. Remove the startup call to `trialWarningOperations.checkAndNotify()` in `LicenseStateHandler.initialize()`, since the count no longer advances there.
- `recordTrialUsage()` currently does not check the status itself, because its only caller did. Guard on `trial` in `recordPanelUse()` (or move the guard into `recordTrialUsage()`), so a licensed user never gets trial days written.
- Update comments that state the count advances only at startup: `TrialWarningOperations` class doc and the comment in `LicenseStateHandler.initialize()`.

Showing a panel with no focused window: `togglePanelForFocusedWindow()` returns without showing anything when there is no focused window. Recording before that check counts the attempt; this is acceptable (the user tried to use sutto that day), and keeping the call at one spot before `getDisabledReason()` is simpler than splitting it.

Out of scope: when the trial ends, the status is still written as `expired`. A separate status for an ended trial is a follow-up change.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] A unit test drives `LicenseStateHandler.recordPanelUse()` with a fake repository in `trial` status and asserts that today's date and an incremented day count are saved, and that a second call on the same day saves nothing
- [x] A unit test asserts that `recordPanelUse()` writes no trial data when the status is `valid`, `expired`, or `invalid`
- [x] A unit test asserts that when `recordPanelUse()` records the day that reaches the limit, `getDisabledReason()` returns a non-null reason immediately after the call (the status becomes `expired` today, so the reason is `license-expired`)
- [x] A unit test asserts that the pre-expiry warning is sent when a recorded day crosses a warning threshold, and not sent when no day was recorded
- [x] A unit test asserts that `initialize()` no longer records a trial day
- [x] `handleTrialStartup` no longer exists in `src/` (grep gate in `check_command`)
- [x] `src/composition/` calls `licenseStateHandler.recordPanelUse()` at least twice, once per panel entry point (count gate in `check_command`)
