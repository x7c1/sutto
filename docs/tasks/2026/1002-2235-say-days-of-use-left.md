---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rqE 'trial ends in|days remaining' src/ site/"
assignee: null
branch: task/1002-2235-say-days-of-use-left
created_at: 2026-10-02T13:35:32Z
updated_at: 2026-10-02T13:39:37Z
---

# fix(license): say how many days of use are left in the trial

## Overview

The [Trial Period](../../concepts/trial-period/README.md) counts days of use: only a day on which the user triggers the main panel uses up a day. Two user-facing strings read as calendar days instead:

- The pre-expiry warning (`formatTrialWarningMessage` in `src/domain/licensing/trial-warning.ts`): "Your Sutto trial ends in 3 days. Activate a license to keep using it." A user who opens the panel only now and then keeps the trial far longer than 3 calendar days.
- The trial subtitle in the preferences window and the top bar menu (`getLicenseStatusDisplay` in `src/domain/licensing/license-status-display.ts`): "12 days remaining", which also reads "1 days remaining" on the last day.

Change both to count days of use, with the singular for one day:

- Warning: "Your Sutto trial has 3 days of use left. Activate a license to keep using it." / "… has 1 day of use left. …"
- Subtitle: "12 days of use left" / "1 day of use left"

The notification title "Trial ending soon" and wording that does not count days stay as they are. Update the tests that assert these strings, and any other user-facing text in `src/` or `site/` that states the remaining trial days with the old wording.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] Unit tests assert the warning text for 3 days ("has 3 days of use left") and for 1 day ("has 1 day of use left")
- [x] Unit tests assert the trial subtitle for several days ("12 days of use left") and for one day ("1 day of use left")
- [x] "trial ends in" and "days remaining" no longer appear in `src/` or `site/` (grep gate in `check_command`)
