---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rqwE 'clearLicense|shouldExtensionBeEnabled|withStatus|isUnknown|isValidNetworkState|InvalidLicenseError' src/ && ! grep -qE 'isValid\\(\\): boolean' src/domain/licensing/license.ts && ! grep -q 'clear (a License)' docs/concepts/license/README.md"
assignee: null
branch: task/1002-2240-remove-unused-licensing-code
created_at: 2026-10-02T13:40:48Z
updated_at: 2026-10-02T13:47:18Z
---

# refactor(license): remove licensing code that nothing calls

## Overview

Several licensing functions are defined, and some are tested, but no production code calls them. They describe behaviour the extension does not have, and recent changes kept extending them; for example, `clearLicense()` gained a rule for ended trials although nothing can clear a license. Remove them:

- `LicenseOperations.clearLicense()` (`src/operations/licensing/license-operations.ts`), `LicenseRepository.clearLicense()` (`src/operations/licensing/license-repository.ts`) and its GSettings implementation (`src/infra/glib/license-repository.ts`). The preferences window has no control that removes a license, and none is planned.
- `LicenseOperations.shouldExtensionBeEnabled()`. Whether the extension is enabled is decided by `getDisabledReason()`; update the doc comment that refers to it.
- `License.isValid()` and `License.withStatus()` (`src/domain/licensing/license.ts`).
- `DeviceId.isUnknown()` (`src/domain/licensing/device-id.ts`).
- `isValidNetworkState()` (`src/domain/licensing/network-state.ts`) and its export from `src/domain/licensing/index.ts`.
- `InvalidLicenseError` (`src/domain/licensing/license.ts`), which nothing throws, and its export.

Remove the tests and test doubles that exist only for these (for example the `clearLicense` describe block and the `clearLicense` members of fake repositories). In `docs/concepts/license/README.md`, remove the Collocation "clear (a License)", since the product has no such action.

Keep everything that production code uses, including the constant arrays (`LICENSE_STATUSES`, `NETWORK_STATES`, `TRIAL_PROBE_RESULTS` and similar) that define types and back the remaining validators. Behaviour does not change.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] `clearLicense`, `shouldExtensionBeEnabled`, `withStatus`, `isUnknown`, `isValidNetworkState` and `InvalidLicenseError` no longer appear in `src/`, and `License.isValid()` is gone (grep gates in `check_command`)
- [x] The License concept document no longer lists "clear (a License)" (grep gate in `check_command`)
- [x] The build, lint and the remaining tests pass with no behaviour change (`npm run build && npm run check && npm run test:run`)
