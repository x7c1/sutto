---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && grep -rq \"'trial-expired'\" src/domain/licensing/license-status.ts && grep -q 'trial-expired' docs/concepts/license/license-status/README.md && grep -q 'triggers the' docs/concepts/trial-period/README.md && grep -q 'name=\"trial-probe-result\"' dist/schemas/org.gnome.shell.extensions.sutto.gschema.xml"
assignee: null
branch: task/1002-2146-trial-expired-status-and-probe
created_at: 2026-10-02T12:46:53Z
updated_at: 2026-10-02T13:00:57Z
---

# feat(license): give an ended trial its own status and reopen it when the license server is gone

## Overview

When the trial reaches its last day, `LicenseOperations.recordTrialUsage()` (`src/operations/licensing/license-operations.ts`) stores the status `expired`. That is the status the license server's "your subscription has expired" answer also produces, so the two cannot be told apart, and [License Status](../../concepts/license/license-status/README.md) defines `expired` as a License whose subscription ended, which an ended trial is not. `getLicenseStatusDisplay` works around it by guessing from `trialDaysRemaining === 0` (`src/domain/licensing/license-status-display.ts`).

The difference matters for one rule: the license gate is a reminder for people willing to pay, not enforcement, and it must keep working when the license server is gone for good. A device whose license the server rejected stays locked. A device whose trial ended stays locked while the server is running, but opens when the server no longer answers, so retiring the server never strands anyone.

**Status.** Add `trial-expired` to `LICENSE_STATUSES` (`src/domain/licensing/license-status.ts`). The status moves from `trial` to `trial-expired` when the day that reaches the limit is recorded. `expired` and `invalid` are used only for answers from the license server. Update `docs/concepts/license/license-status/README.md` to define five statuses, with `trial-expired` meaning the Trial Period has ended and no License was activated. In `docs/concepts/trial-period/README.md`, add a Domain Rule stating when a usage day is recorded: when the user triggers the Main Panel (logging in or unlocking the screen does not count), and that recording the day that reaches the limit ends the Trial Period at that same trigger.

**License Status definitions.** In the same document, align the definitions with how the client maps the server's answers: `expired` covers a subscription that ended or was cancelled and a device whose activation was deactivated (`LICENSE_EXPIRED`, `LICENSE_CANCELLED`, `DEVICE_DEACTIVATED`); `invalid` means the server rejected the license key or the activation (`INVALID_LICENSE_KEY`, `INVALID_ACTIVATION`). State that a License whose validation got no answer keeps its status. In `docs/concepts/license/README.md`, add two Domain Rules: no answer from the license server is not a rejection (the stored License and License Status stay as they are), and a rejected activation changes nothing (a user in the Trial Period stays in it).

**Existing installations.** A stored status `expired` with an empty license key was written by the old trial expiry. Rewrite it to `trial-expired` once, at startup. A stored `expired` with a license key is a real expired License and stays.

**Clearing a license.** `clearLicense()` returns to `trial`. When the trial days are already used up, it must return to `trial-expired` instead, so clearing a license never restarts an ended trial.

**Reachability probe.** At startup, when the status is `trial-expired` and the device is online, ask the license server once whether it is there: call `POST /v1/license/validate` with an empty `license_key` and an empty `activation_id`, through a new method on `LicenseApiClient` (the existing `validate` takes value objects that reject empty strings). Classify the answer with the same rules as every other response: a rejection (4xx with a known reason code) or a success means the server answered; no response means it did not. Store the result in a new GSettings key `trial-probe-result` (string: `none`, `answered`, `no-response`; default `none`), read and written through `LicenseRepository`. While offline, do not probe and keep the stored result.

**Gate.** For `trial-expired`, `getDisabledReason()` returns:

- `null` when the last probe result is `no-response` and the device is online
- `null` when the last probe result is `no-response`, the device is offline, and fewer than `OFFLINE_GRACE_PERIOD_DAYS` days have passed since `last-online-at`; `offline-grace-exceeded` after that
- `trial-expired` otherwise, including when the device was never probed (`none`)

A `trial` status whose days are used up (for example written by another process) is treated as `trial-expired`.

**Display.** `getLicenseStatusDisplay` shows `trial-expired` as "Trial Expired" / "Please purchase a license" with the purchase link, whether or not the gate is open, and drops the `trialDaysRemaining === 0` guess from the `expired` branch. Pre-expiry trial warnings (`evaluateTrialWarning`) are only for `trial`. The locked-panel headline for `offline-grace-exceeded` in `src/domain/licensing/disabled-reason.ts` reads "Sutto couldn't verify your license.", but the lock now follows from being offline for too long, not from a failed verification; reword it to say the device has been offline too long (the instruction "Reconnect to the internet to continue." stays). In `site/en/license-activation.md`, the no-response section ends with "Sutto continues to work normally regardless of server availability.", which is not true for an ended trial while the server is running; rewrite it to say what happens now (a valid license keeps working, an ended trial opens only when the server no longer answers).

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `LICENSE_STATUSES` includes `trial-expired`, the License Status concept document defines it, the Trial Period concept document says a usage day is recorded when the user triggers the Main Panel, and the schema defines `trial-probe-result` (grep gates in `check_command`)
- [x] A unit test asserts that recording the day that reaches the limit stores `trial-expired`, not `expired`
- [x] Unit tests assert the one-time rewrite at startup: `expired` with an empty license key becomes `trial-expired`; `expired` with a license key stays `expired`
- [x] Unit tests assert that `clearLicense()` stores `trial` while trial days remain and `trial-expired` when they are used up
- [x] Unit tests for the probe at startup: online and `trial-expired` → the probe runs and stores `answered` for a rejection and for a success, `no-response` for no response; offline → no probe and the stored result is kept; status other than `trial-expired` → no probe
- [x] Unit tests for `getDisabledReason()` with `trial-expired`: `none` → `trial-expired`; `answered` → `trial-expired`; `no-response` online → null; `no-response` offline within 7 days of `last-online-at` → null; `no-response` offline after 7 days → `offline-grace-exceeded`
- [x] A unit test asserts that a `trial` status whose days are used up is gated like `trial-expired`
- [x] Unit tests assert the display of `trial-expired` and that `expired` always shows the subscription message
- [x] A unit test asserts the HTTP probe request sends empty `license_key` and `activation_id` (through the classification or request-building function that runs without GJS)
