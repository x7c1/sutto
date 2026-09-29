---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, user-experience]
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && grep -q 'show-top-bar-indicator' dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml && grep -rq 'show-top-bar-indicator' src/prefs/ && grep -rq 'PanelMenu' src/ && ! grep -rq 'function getStatusDisplay' src/prefs/"
assignee: null
branch: task/0929-2227-add-top-bar-indicator
created_at: 2026-09-29T13:27:22Z
updated_at: 2026-09-29T13:43:23Z
---

# feat(ui): add a top bar indicator with panel, preferences and license entries

## Overview

sutto has no persistent UI today. The panel opens only from the keyboard shortcut or an edge trigger, preferences open through the GNOME Extensions app, and the license state (trial days remaining, offline grace, purchase link) is visible only inside the preferences window. Add a GNOME Shell panel indicator (a top bar icon with a popup menu) so these are always one click away. It is shown by default, and the user can hide it from the preferences window; toggling the setting takes effect immediately, without restarting the Shell.

Menu items, top to bottom:

- **Show Panel** — does exactly what the show-panel shortcut does. `Controller.onShowPanelShortcut` in `src/composition/controller.ts` shows the panel at the focused window's center, shows the locked panel when the license is invalid (at the focused window or the cursor), and hides the panel when it is already visible. Extract that logic into a method the indicator can call as well, instead of duplicating it. With a valid license and no focused window the shortcut currently logs and does nothing; from a menu that would look broken, so make the item insensitive in that state, re-evaluated each time the menu opens.
- **Preferences…** — opens the extension's preferences. `src/extension.ts` already passes `() => this.openPreferences()` into the `Controller`; reuse it.
- **License status** — a non-interactive row showing the same title and subtitle as the license row in the preferences window (e.g. "Trial — 12 days remaining", "Active — Valid until …", "Active — Offline - connect within 3 days"), updated whenever the license state changes (`LicenseOperations.onStateChange`, which supports multiple listeners).
- **Purchase License…** — shown only when the preferences window would show its purchase button (trial, and states without a valid license), and opens the purchase URL.

The mapping from `LicenseState` to that title, subtitle and purchase-link flag lives today in `getStatusDisplay` in `src/prefs/license-ui.ts`, a GTK file the extension bundle cannot share. Move it to `src/domain/licensing/` as a pure function, export it from the domain index, and have both the preferences window and the indicator use it. Give it a unit test next to it covering each branch (trial online, trial with backend unreachable, valid online, valid offline, valid with backend unreachable, and the remaining statuses). The purchase URL is a build-time define (`__LICENSE_PURCHASE_URL__`) that `esbuild.config.js` currently passes only to the prefs build; add it to the extension build's `define` too.

Add a boolean GSettings key `show-top-bar-indicator` (default `true`) to `dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml` (the tracked schema source), a switch for it in the preferences window, and an accessor in the preferences repository (`src/infra/glib/preferences-repository.ts`). The extension watches the key's `changed` signal and adds the indicator (`Main.panel.addToStatusArea`) or destroys it accordingly. The indicator and its signal handlers must be torn down in the controller's/extension's `disable()` path, following the existing `safeDisable` pattern. Use a themed symbolic icon for now (e.g. `view-grid-symbolic`).

## Acceptance criteria

### Automated (pipeline-verified)

- [x] The `LicenseState` → display mapping lives in `src/domain/licensing/` as a pure function with a unit test per branch, and no longer exists in `src/prefs/` (gate: `! grep -rq 'function getStatusDisplay' src/prefs/`)
- [x] The preferences window's license row still renders from the moved function (the project type-checks under `npm run check`)
- [x] The schema defines a boolean key `show-top-bar-indicator` with default `true`, and the preferences window references it (gates: `grep` on the schema and on `src/prefs/`)
- [x] The indicator is implemented with the Shell's `PanelMenu` API (gate: `grep -rq 'PanelMenu' src/`)
- [x] The logic deciding which menu items are shown and whether "Show Panel" is sensitive (license valid/invalid × focused window present/absent × panel visible/hidden; purchase item per license status) is a pure function with a unit test covering each combination

### Manual / on-hardware (verified by a human before merge)

- [ ] On a real GNOME Shell session the icon appears in the top bar after enabling the extension, and each menu item works: Show Panel opens (and toggles) the panel over the focused window, Preferences… opens the preferences window, Purchase License… opens the purchase URL
- [ ] The license status row matches the preferences window's license row, and updates when the license state changes without reopening the Shell
- [ ] With no focused window and a valid license, "Show Panel" is insensitive; with an invalid license it shows the locked panel
- [ ] Turning the preferences switch off removes the icon immediately, turning it on brings it back, and the choice survives a log out / log in
- [ ] Disabling the extension removes the icon and leaves no errors in the journal (`journalctl --user -f /usr/bin/gnome-shell`)

## Out of scope

- A custom bundled icon (a themed symbolic icon is used for now)
- A Quit item (an extension has no such concept; it is disabled from the Extensions app)
- Changing the license gate behavior itself, or the wording of the existing license strings
- Moving the edge-trigger or shortcut UX
