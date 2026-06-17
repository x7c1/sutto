# License Expiry Feedback

Status: Open

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

The design decisions an implementer would otherwise have to guess have been
settled up front — see [Design](#design) and
[Settled decisions](#settled-decisions) — so the implementation can proceed with
minimal back-and-forth.

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

Two complementary surfaces.

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

**Dismissal:** the locked panel reuses the **normal panel's show lifecycle**
(positioning + auto-hide when the cursor leaves, `AUTO_HIDE_DELAY_MS`). No
special dismissal handling is added — only the body rendering differs. To click
"Open Preferences" the user keeps the cursor over the panel, which keeps it open.

The body and call to action vary by reason:

| Reason | Condition | Message (final copy) | Action |
|---|---|---|---|
| `trial-expired` | `status === 'trial'` and trial expired | "Your Sutto trial has ended. Activate a license to keep snapping windows." | Open Preferences |
| `license-expired` | `status === 'expired'` | "Your Sutto license has expired. Re-activate it to continue." | Open Preferences |
| `license-invalid` | `status === 'invalid'` | "Your Sutto license is no longer valid. Re-activate it to continue." | Open Preferences |
| `offline-grace-exceeded` | `status === 'valid'`, offline, grace exceeded | "Sutto couldn't verify your license. Reconnect to the internet to continue." | none (informational; recovers automatically once back online and re-validated) |

### 2. Pre-expiry trial warning (proactive)

The lapse should never be a surprise. While in trial, warn the user as the end
approaches using a GNOME Shell notification when `trialDaysRemaining` first
crosses **3 days** and **1 day** remaining:

```
  ┌ Sutto ─────────────────────┐
  │ Your trial ends in 3 days. │
  │ Activate to keep using it. │
  │            [Open Prefs]    │
  └────────────────────────────┘
```

Final copy: "Your Sutto trial ends in {n} day(s). Activate a license to keep
using it." (`{n}` is `3` or `1`, with correct singular/plural).

This is the one place a notification is the right surface: proactive,
low-frequency, not tied to a specific in-context gesture. Each threshold fires at
most once per trial (see [Pre-expiry warning](#pre-expiry-warning)).

This applies to **trial only**. Hard expiry (`expired` / `invalid`) has no
pre-warning notification — it is surfaced solely through the locked panel on the
next trigger (see [Settled decisions](#settled-decisions)).

### Explicitly out of this plan's surfaces

A persistent top-bar indicator and a preferences-page status banner were
considered and **deferred**. The locked panel plus the pre-expiry trial warning
cover the "tell me what happened" and "don't surprise me" needs; an ambient
indicator can be revisited later if the locked panel proves insufficient.

## Settled decisions

Decisions made up front so implementation does not stall on them:

- **Trial warning thresholds:** 3 days and 1 day remaining.
- **Locked panel dismissal:** identical to the normal panel (auto-hide on cursor
  leave); no bespoke dismissal logic.
- **Hard expiry (expired/invalid):** locked panel only — **no** startup/login
  notification.
- **Offline-grace-exceeded:** locked panel with an informational message and no
  action button; recovers automatically on reconnect + re-validation.
- **Panel API shape:** add `MainPanel.showLocked(reason)`; do not add a mode
  branch inside the existing `show(cursor, window)`. `showLocked` reuses the same
  internal show/positioning/auto-hide lifecycle and only swaps the rendered body.
- **Reason source:** add `LicenseOperations.getDisabledReason(): DisabledReason | null`
  (`null` = enabled) as the single source of truth; reimplement
  `shouldExtensionBeEnabled()` as `getDisabledReason() === null`. Expose the
  reason through `LicenseStateHandler` so the Controller does not recompute it.
- **NotificationService:** introduce a minimal version in this plan (do not block
  on plan 028). It is used only for the pre-expiry warning. Align the interface
  with plan 028 so 028 can later generalize/replace it.
- **Warning check timing:** check on `enable()`/startup only (the trial day count
  advances at startup, so no in-session timer is needed).
- **Test scope:** unit-test the pure logic (reason mapping, warning
  threshold/once-only). GNOME-dependent rendering is covered by the manual
  verification step, not unit tests.

## Technical Approach

### Reason mapping

`DisabledReason` is the union `'trial-expired' | 'license-expired' |
'license-invalid' | 'offline-grace-exceeded'`. `LicenseOperations.getDisabledReason()`
computes it from the current `LicenseState` (returning `null` when the extension
should be enabled). A small pure helper maps a `DisabledReason` to its user-facing
message and whether an "Open Preferences" action applies; this helper is the unit
under test for copy/logic.

### Locked panel rendering

- `src/ui/main-panel/renderer.ts` gains a locked-state variant that renders the
  reason message and, when applicable, an "Open Preferences" button, in place of
  the layout picker.
- `MainPanel` (`src/ui/main-panel/`) gains `showLocked(reason)` alongside
  `show(cursor, window)`, reusing the existing positioning and auto-hide
  lifecycle (only the body render differs).
- `src/composition/controller.ts`:
  - `showMainPanel()` — when the license is invalid, resolve the reason and call
    `mainPanel.showLocked(reason)` instead of returning early.
  - `onShowPanelShortcut()` — same.
  - `enable()` `onBecameInvalid` callback — if the panel is currently visible,
    switch it to the locked state; if hidden, leave it hidden until the next
    trigger.

### Opening preferences from the locked panel

The panel runs in the shell process. Wire an `onOpenPreferences` callback from the
entry point (`src/extension.ts`, which holds the `Extension` instance) down to the
panel, calling the extension's `openPreferences()`. The locked panel's button
invokes this callback.

### Pre-expiry warning

- On `enable()`/startup, if `status === 'trial'` and not expired, evaluate the
  thresholds `[3, 1]` against `trialDaysRemaining`.
- Fire the notification for the most urgent threshold `T` where
  `trialDaysRemaining <= T` and `T` has not already been warned for this trial.
- Persist the last-warned threshold in a new GSettings key (e.g.
  `trial-warning-last-threshold`, int, default `0` meaning "none warned") so a
  threshold fires at most once and re-login does not re-fire it. Because
  `trialDaysRemaining` only decreases, the stored threshold only decreases. Reset
  it when the status leaves `trial` (e.g. on activation).
- Notifications go through the minimal `NotificationService`.

### Integration points

- `src/composition/controller.ts` — locked-panel wiring on the three paths above.
- `src/ui/main-panel/renderer.ts` (+ `MainPanel`) — locked-state rendering and
  `showLocked`.
- `src/operations/licensing/license-operations.ts` — `getDisabledReason()`;
  `shouldExtensionBeEnabled()` becomes a thin wrapper.
- `src/composition/licensing/license-state-handler.ts` — expose the reason.
- `src/extension.ts` — `onOpenPreferences` wiring; pre-expiry warning on enable.
- New schema key in `org.gnome.shell.extensions.sutto.gschema.xml` for the
  last-warned threshold.
- New: `DisabledReason` + reason→message helper, `NotificationService` (interface
  + GNOME impl).

## Tasks

- [ ] Add `DisabledReason` and `LicenseOperations.getDisabledReason()`; rewrite
      `shouldExtensionBeEnabled()` as a thin wrapper; expose the reason via
      `LicenseStateHandler`.
- [ ] Add the reason→message helper (message + action applicability).
- [ ] Add a locked-state variant to `renderer.ts` and `MainPanel.showLocked(reason)`
      reusing the existing show/auto-hide lifecycle.
- [ ] Wire the locked panel into `showMainPanel()` and `onShowPanelShortcut()` in
      `controller.ts` (replace the silent returns).
- [ ] Switch a visible panel to the locked state on the runtime `onBecameInvalid`
      transition; leave a hidden panel hidden.
- [ ] Wire an `onOpenPreferences` callback from `extension.ts` to the locked
      panel's button (via `Extension.openPreferences()`).
- [ ] Add a minimal `NotificationService` (operations interface + GNOME infra
      implementation), interface aligned with plan 028.
- [ ] Add the `trial-warning-last-threshold` GSettings key and the pre-expiry
      warning logic (thresholds 3 and 1; once per threshold; reset on activation).
- [ ] Unit tests: reason mapping/copy, and warning threshold/once-only logic.
- [ ] Run `npm run build && npm run check && npm run test:run`.
- [ ] Manual verification: set `license-status` to `expired` via `dconf`, drag a
      window to a screen edge, and confirm the locked panel appears with the
      correct message and a working "Open Preferences" button; verify it auto-hides
      like the normal panel.
