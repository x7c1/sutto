# License Expiry Feedback

Status: Draft

## Overview

When the license is no longer valid (the trial has ended, the license is
expired/invalid, or the offline grace period has been exceeded), Sutto silently
suppresses the Main Panel. Dragging a window to a screen edge or pressing the
show-panel shortcut does nothing, and the only trace is a `log()` line in the
journal. Users have no way to understand *why* the extension stopped responding.

This plan adds user-facing feedback: when the panel is suppressed because of
license state, the user is told what happened and how to resolve it (activate a
license in preferences) instead of the feature appearing silently broken.

## Background

### Current behavior

The Controller gates every panel-show path on `LicenseStateHandler.isValid()`,
and each gate fails silently (`src/composition/controller.ts`):

- **Edge-drag path** — `showMainPanel()` returns early with
  `log('[Controller] Cannot show panel: license invalid')`.
- **Shortcut path** — `onShowPanelShortcut()` returns early with
  `log('[Controller] License invalid, ignoring shortcut')`.
- **Runtime transition** — the `enable()` `onBecameInvalid` callback calls
  `this.mainPanel.hide()` with only `log('[Controller] License invalid, hiding panel')`.
- **Startup** — `LicenseStateHandler` logs
  `License invalid on startup, extension disabled` and stops
  (`src/composition/licensing/license-state-handler.ts`).

`shouldExtensionBeEnabled()` (`src/operations/licensing/license-operations.ts`)
returns `false` in these cases:

- `status === 'trial'` and the trial is expired (30 days used).
- `status === 'expired'` or `status === 'invalid'`.
- `status === 'valid'` but offline and `daysSinceLastValidation >= 7` (offline
  grace period exceeded).

License statuses are defined in `src/domain/licensing/license-status.ts`:
`'trial' | 'valid' | 'expired' | 'invalid'`.

### Why this matters

This is a real UX failure. From the user's perspective the feature is simply
broken: nothing happens on edge drag, with no message and no hint. Diagnosing it
requires reading the journal and inspecting `dconf` values — far more than a user
should ever need to do. An expired trial or license is an *expected* end state,
and it deserves a clear, actionable message.

### Relationship to plan 028 (Improve Error Handling)

Plan 028 (`docs/plans/2026/028-improve-error-handling`) proposes a general
`NotificationService` for surfacing *errors* via GNOME Shell notifications.
License expiry is not an error — it is an expected state — but both efforts need
the same notification primitive. This plan should **reuse** `NotificationService`
if plan 028 lands first; otherwise it introduces a minimal version that plan 028
later generalizes. Coordinate to avoid duplicate abstractions.

## Scope

### In Scope

- Notify the user when a panel-show attempt (edge drag or shortcut) is suppressed
  because the license is invalid.
- Tailor the message to the reason: trial ended vs. license expired/invalid vs.
  offline-validation-stale.
- Provide a path to resolution (e.g. a notification action button that opens
  preferences / the license page).
- Throttle notifications so repeated edge drags do not spam the user.
- Feedback when the license transitions to invalid at runtime.

### Out of Scope

- Changing license validation logic, trial length, or grace-period rules.
- Changing the license activation flow (the preferences License UI already
  handles activation).
- General error notifications unrelated to licensing (covered by plan 028).

## Technical Approach

### Reason mapping

Add a helper that maps the current `LicenseState` to a user-facing *reason* and
message. The reason should be exposed from `LicenseStateHandler` /
`LicenseOperations` rather than recomputed inside the Controller. Candidate
reasons and messages:

| Reason | Condition | Message (draft) |
|---|---|---|
| `trial-expired` | `status === 'trial'` and trial expired | "Your Sutto trial has ended. Activate a license to keep using it." |
| `license-expired` | `status === 'expired'` | "Your Sutto license has expired. Open preferences to re-activate." |
| `license-invalid` | `status === 'invalid'` | "Your Sutto license is no longer valid. Open preferences to re-activate." |
| `offline-grace-exceeded` | `status === 'valid'`, offline, grace exceeded | "Sutto couldn't verify your license. Reconnect to the internet to continue." |

### Notification surface

Use GNOME Shell's notification system (`Main.notify` / a `MessageTray.Source`),
ideally with an action button that opens the extension preferences. Wrap this in
a `NotificationService` abstraction — an operations-layer interface with a
GNOME-Shell infra-layer implementation — shared with / aligned to plan 028.

### Throttling

`showMainPanel()` fires frequently during edge drags, so naive notification would
spam. Introduce a small `LicenseFeedbackNotifier` (composition layer) that:

- Notifies on the **first** user-initiated attempt after the license becomes
  invalid.
- Suppresses repeats within a cooldown window (or limits to once per session).
- Resets its state when the license becomes valid again.

### Integration points

- `src/composition/controller.ts`
  - `showMainPanel()` — replace the silent return with
    `licenseFeedback.notifySuppressed(reason)`.
  - `onShowPanelShortcut()` — same.
  - `enable()` `onBecameInvalid` callback — notify once on the runtime transition
    to invalid.
- `src/composition/licensing/license-state-handler.ts` — expose the reason so the
  notifier can render an accurate message.
- New: `LicenseFeedbackNotifier` (composition layer) + `NotificationService`
  (operations interface, infra implementation).

### Design decisions to settle during implementation

- **When to notify**: on first suppressed user attempt (then throttle) vs.
  once-per-session vs. at startup. Recommendation: notify on the first
  user-initiated attempt after becoming invalid, then throttle. Avoid an
  unsolicited startup/login notification. Record the decision as a short ADR if
  it turns out non-trivial.
- **Action button**: whether the notification includes an "Open Preferences"
  action (recommended), and how to open preferences from the shell process.

## Tasks

- [ ] Add a reason mapping from `LicenseState` to a user-facing message.
- [ ] Introduce / reuse `NotificationService` (operations interface + GNOME infra
      implementation), aligned with plan 028.
- [ ] Add `LicenseFeedbackNotifier` with throttling / once-per-invalid-transition
      logic.
- [ ] Wire feedback into `showMainPanel()` and `onShowPanelShortcut()` in
      `controller.ts`.
- [ ] Wire feedback into the runtime `onBecameInvalid` callback in `enable()`.
- [ ] (Optional) Add an "Open Preferences" action button to the notification.
- [ ] Add unit tests for the reason mapping and throttling logic.
- [ ] Run `npm run build && npm run check && npm run test:run`.
- [ ] Manual verification: set `license-status` to `expired` via `dconf`, drag a
      window to a screen edge, and confirm a notification appears with the correct
      message.
