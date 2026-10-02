---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rqE 'isExpired\\(\\): boolean' src/domain/licensing/license.ts"
assignee: null
branch: task/1002-2211-show-last-verified-after-valid-until
created_at: 2026-10-02T13:11:45Z
updated_at: 2026-10-02T13:20:29Z
---

# fix(license): show the last verified date once the valid-until date has passed

## Overview

A valid License keeps working when the license server does not answer: the server says "no" explicitly (`LICENSE_EXPIRED`, `LICENSE_CANCELLED`, ...), and no answer never locks the user out. The License's valid-until date (`license-valid-until`) is refreshed only by a successful validation, so when the server stops answering it eventually lies in the past while the License is still `valid` and working. The status display (`getLicenseStatusDisplay` in `src/domain/licensing/license-status-display.ts`, used by the preferences window and the top bar indicator) then keeps showing "Active / Valid until <a past date>", which reads as an expired license that somehow still works.

Show what is actually known instead:

- `valid` and online, valid-until in the future (or today): "Active / Valid until YYYY-MM-DD", as now.
- `valid` and online, valid-until in the past: "Active / Last verified YYYY-MM-DD", using the License's last successful validation (`License.lastValidated`, stored as `license-last-validated`). If that date is missing, show "Active" with the subtitle "Not verified yet".
- `valid` and offline: unchanged ("Offline - connect within N days" / "Offline - reconnect to the internet to continue").

Keep `getLicenseStatusDisplay` a pure function of `LicenseState`: decide "valid-until has passed" where the current time is available (`LicenseOperations.getState()` has the `DateProvider`), and expose what the display needs on `LicenseState` (for example the last verified date and whether valid-until has passed). The valid-until date is display-only: it does not decide whether the extension is enabled, and this change must not make it do so.

Also remove `License.isExpired()` (`src/domain/licensing/license.ts`). Nothing in production calls it, and it suggests that a passed valid-until date expires a License, which is not the rule. Remove or adapt any test that only exercises it. Add a short doc comment on `License.validUntil` saying it is the end date last confirmed by the license server and is shown to the user, not used to decide access.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] Unit tests for `getLicenseStatusDisplay` with `valid` and online: valid-until in the future shows "Valid until <date>"; valid-until in the past with a last verified date shows "Last verified <date>"; valid-until in the past with no last verified date shows "Not verified yet"
- [x] A unit test asserts that `valid` and offline still shows the offline subtitle when valid-until has passed
- [x] A unit test asserts that `LicenseOperations.getState()` reports valid-until as passed or not using the `DateProvider`, and exposes the last verified date
- [x] A unit test asserts that `getDisabledReason()` returns null for a `valid` License whose valid-until has passed while online
- [x] `License.isExpired()` no longer exists (grep gate in `check_command`)
