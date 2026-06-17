# License Expiry Feedback

Status: Draft

## Overview

When the license is no longer valid (the trial has ended, the license is
expired/invalid, or the offline grace period has been exceeded), Sutto silently
suppresses the Main Panel. Dragging a window to a screen edge or pressing the
show-panel shortcut does nothing, and the only trace is a `log()` line in the
journal. Users have no way to understand *why* the extension stopped responding.

This plan makes the failing trigger the teaching moment: instead of swallowing
the gesture, **the Main Panel still appears, but in a locked "license required"
state** that explains what happened and offers a one-tap path to resolution. In
addition, the extension **warns the user before the trial expires** so the lapse
is never a surprise.

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
and it deserves a clear, actionable message delivered where the user is already
looking.

## Design

Two complementary surfaces, chosen for this plan:

### 1. Locked panel on the failing trigger (primary)

The whole bug is that the trigger does nothing. So the fix is to **keep the
trigger working** and answer the user's mental model ("I dragged to the edge, the
panel should be here") directly. When the panel-show path runs while the license
is invalid, render the Main Panel in a locked state instead of suppressing it:

```
Drag to edge / press shortcut → panel appears, but the body is locked

┌──────────────────────────────┐
│  Sutto                       │
│                              │
│    🔒  Trial ended           │
│    Activate a license to     │
│    keep snapping windows.    │
│                              │
│      [ Open Preferences ]    │
└──────────────────────────────┘
```

Rationale for choosing this over a transient toast: a notification fades and is
easily missed — which is exactly the "I couldn't tell what happened" failure this
plan exists to fix. The locked panel puts the explanation and the call to action
in the user's line of sight, at the moment of highest intent.

The body and call to action vary by reason:

| Reason | Condition | Message (draft) | Action |
|---|---|---|---|
| `trial-expired` | `status === 'trial'` and trial expired | "Your Sutto trial has ended. Activate a license to keep snapping windows." | Open Preferences |
| `license-expired` | `status === 'expired'` | "Your Sutto license has expired. Re-activate it to continue." | Open Preferences |
| `license-invalid` | `status === 'invalid'` | "Your Sutto license is no longer valid. Re-activate it to continue." | Open Preferences |
| `offline-grace-exceeded` | `status === 'valid'`, offline, grace exceeded | "Sutto couldn't verify your license. Reconnect to the internet to continue." | (no purchase CTA; informational — recovers automatically when back online) |

### 2. Pre-expiry trial warning (proactive)

The lapse should never be a surprise. While in trial, warn the user as the end
approaches using a GNOME Shell notification — e.g. when `trialDaysRemaining`
crosses a threshold such as 3 days and 1 day:

```
  ┌ Sutto ─────────────────────┐
  │ Your trial ends in 3 days. │
  │ Activate to keep using it. │
  │            [Open Prefs]    │
  └────────────────────────────┘
```

This is the one place a notification is the right surface: it is proactive,
low-frequency, and not tied to a specific in-context gesture. Notify at most once
per threshold per trial (track the last-warned day so login does not re-fire it).

### Explicitly out of this plan's surfaces

A persistent top-bar indicator and a preferences-page status banner were
considered and **deferred**. The locked panel plus the pre-expiry warning cover
the "tell me what happened" and "don't surprise me" needs; an ambient indicator
can be revisited later if the locked panel proves insufficient.

## Scope

### In Scope

- Render the Main Panel in a locked "license required" state when a panel-show
  attempt (edge drag or shortcut) runs while the license is invalid, instead of
  suppressing it silently.
- Tailor the locked-state message and call to action to the reason (trial ended /
  license expired / license invalid / offline-validation-stale).
- An "Open Preferences" action in the locked panel that opens the extension
  preferences (so the user can activate a license).
- Pre-expiry trial warning notifications at defined thresholds, fired at most once
  per threshold per trial.
- Handle the runtime transition: if the panel is open when the license becomes
  invalid, switch it to the locked state (rather than only hiding it).

### Out of Scope

- Changing license validation logic, trial length, or grace-period rules.
- Changing the license activation flow itself (the preferences License UI already
  handles activation).
- A persistent top-bar indicator and a preferences-page status banner (deferred —
  see "Explicitly out of this plan's surfaces").
- General error notifications unrelated to licensing (covered by plan 028,
  `docs/plans/2026/028-improve-error-handling`).

## Technical Approach

### Reason mapping

Add a helper that maps the current `LicenseState` to a user-facing *reason*
(`trial-expired` | `license-expired` | `license-invalid` |
`offline-grace-exceeded`) plus its message and whether an "Open Preferences"
action applies. Expose the reason from `LicenseStateHandler` / `LicenseOperations`
rather than recomputing it inside the Controller or the renderer.

### Locked panel rendering

- `src/ui/main-panel/renderer.ts` gains a locked-state variant that renders the
  reason message and (when applicable) an "Open Preferences" button, in place of
  the layout picker.
- `MainPanel` (`src/ui/main-panel/`) gains a way to be shown in locked mode —
  e.g. `showLocked(reason)` alongside the existing `show(cursor, window)`, or a
  mode argument threaded into `show()`.
- `src/composition/controller.ts`:
  - `showMainPanel()` — when `!licenseStateHandler.isValid()`, call
    `mainPanel.showLocked(reason)` instead of returning early.
  - `onShowPanelShortcut()` — same.
  - `enable()` `onBecameInvalid` callback — if the panel is currently visible,
    switch it to the locked state; otherwise leave it hidden until the next
    trigger.

### Opening preferences from the locked panel

The panel runs in the shell process. Wire an `onOpenPreferences` callback from the
entry point (`src/extension.ts`, which holds the `Extension` instance) down to the
panel, using the extension's `openPreferences()`. The callback is invoked by the
locked panel's button.

### Pre-expiry warning

- A small notifier checks `trialDaysRemaining` on startup/enable and fires a
  notification when a threshold (e.g. 3, 1) is newly crossed.
- Use a `NotificationService` abstraction (operations-layer interface +
  GNOME-Shell infra implementation). This is the only notification surface in
  this plan; align it with plan 028's proposed `NotificationService` (reuse if
  028 lands first, otherwise introduce a minimal version here).
- Persist the last-warned threshold/day (a GSettings key) so repeated logins do
  not re-fire the same warning.

### Integration points

- `src/composition/controller.ts` — locked-panel wiring on the three paths above.
- `src/ui/main-panel/renderer.ts` (+ `MainPanel`) — locked-state rendering.
- `src/composition/licensing/license-state-handler.ts` — expose the reason.
- `src/extension.ts` — `onOpenPreferences` wiring; pre-expiry warning on enable.
- New: reason-mapping helper, `NotificationService` (interface + GNOME impl).

## Open questions

- Exact warning thresholds (3 / 1 days? also 7?).
- Whether the locked panel should auto-dismiss like the normal panel (cursor
  leaves) or stay until clicked, given it now carries an actionable button.

## Tasks

- [ ] Add a reason mapping from `LicenseState` to message + action applicability.
- [ ] Add a locked-state variant to `renderer.ts` and a `showLocked(reason)` path
      on `MainPanel`.
- [ ] Wire the locked panel into `showMainPanel()` and `onShowPanelShortcut()` in
      `controller.ts` (replace the silent returns).
- [ ] Switch a visible panel to the locked state on the runtime `onBecameInvalid`
      transition.
- [ ] Wire an `onOpenPreferences` callback from `extension.ts` to the locked
      panel's button.
- [ ] Introduce / reuse `NotificationService` (operations interface + GNOME infra
      implementation), aligned with plan 028.
- [ ] Add the pre-expiry trial warning (threshold check + once-per-threshold
      persistence via a GSettings key).
- [ ] Add unit tests for the reason mapping and the warning threshold/once-only
      logic.
- [ ] Run `npm run build && npm run check && npm run test:run`.
- [ ] Manual verification: set `license-status` to `expired` via `dconf`, drag a
      window to a screen edge, and confirm the locked panel appears with the
      correct message and a working "Open Preferences" button.
