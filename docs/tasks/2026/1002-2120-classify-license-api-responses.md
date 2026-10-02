---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: [completeness, clarity, concept-alignment, user-experience]
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run && ! grep -rqE 'backend_unreachable|BACKEND_UNREACHABLE|NETWORK_ERROR|UNKNOWN_ERROR' src/"
assignee: null
branch: task/1002-2120-classify-license-api-responses
created_at: 2026-10-02T12:20:43Z
updated_at: 2026-10-02T12:30:18Z
---

# fix(license): treat only a known reason code as a rejection from the license server

## Overview

The license gate must keep working when the license server is down or gone for good. The server says "no" by answering 4xx with a reason code in the `type` field of the JSON body; anything else is no answer at all, and no answer must never lock the user out. Today the client gets this wrong in three ways:

- `HttpLicenseApiClient` (`src/infra/api/http-license-api-client.ts`) reads every 4xx as a rejection. A retired endpoint answering 404 or 410, or a gateway answering 4xx with an HTML body, is read as a rejection (or crashes the JSON parse into a generic failure) instead of as no answer.
- No answer is spread over several error values (`NETWORK_ERROR`, `BACKEND_UNREACHABLE`, `UNKNOWN_ERROR`), and `LicenseOperations` (`src/operations/licensing/license-operations.ts`) has to know which of them mean "no answer". `NetworkState` (`src/domain/licensing/network-state.ts`) also carries a `backend_unreachable` value that `GioNetworkStateProvider` never returns, so the "Server unavailable" lines in `src/domain/licensing/license-status-display.ts` can never show.
- A rejected activation sets the stored status to `invalid` (`handleActivationError`). A trial user who mistypes a license key in the preferences window is locked out with "Your Sutto license is no longer valid", although nothing was ever activated.

Classify every response in the infra layer into exactly one of three outcomes, and let the layers above see only the outcome:

- **success** — 2xx with a body that parses into the expected shape. A 2xx whose body does not parse is no answer.
- **rejected** — 4xx whose JSON body has a `type` equal to one of the known reason codes: `INVALID_LICENSE_KEY`, `INVALID_ACTIVATION`, `LICENSE_EXPIRED`, `LICENSE_CANCELLED`, `DEVICE_DEACTIVATED`. The outcome carries the reason code.
- **no response** — everything else: 404 and 410 whatever the body, any other 4xx without a known reason code (no body, a body that is not JSON, an unknown `type`), 5xx, a transport failure (status 0, timeout, DNS failure), or an unexpected exception.

Then apply the outcomes:

- Validation: `LICENSE_EXPIRED`, `LICENSE_CANCELLED`, `DEVICE_DEACTIVATED` set the status to `expired`; `INVALID_LICENSE_KEY`, `INVALID_ACTIVATION` set it to `invalid`; no response keeps the stored status and license untouched (the existing behaviour for no answer).
- Activation: a rejection is reported to the user with its message and changes nothing in storage, so a trial stays a trial. No response is reported as retryable with one message (for example "Couldn't reach the license server. Try again later."), replacing the separate "No internet connection" and "License server unavailable" messages.
- Remove `backend_unreachable` from `NetworkState` and the branches of `getLicenseStatusDisplay` that test it. `NetworkState` keeps `online` and `offline`.

Keep the outcome types in the operations layer next to `LicenseApiClient` (`src/operations/licensing/license-api-client.ts`) or the domain, as the existing result types are; the HTTP status codes and the JSON body stay inside `src/infra/api/`.

Out of scope: when to attempt validation (for example skipping it while offline) and the offline grace period. Both change in a follow-up.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] Unit tests cover the classification of the HTTP layer, with the status code and body as input: 2xx with a valid body → success; 2xx with an unparsable body → no response; 4xx with each of the five known `type` values → rejected with that reason; 404 and 410 with and without a known `type` → no response; 400 with no body, with a non-JSON body, and with an unknown `type` → no response; 5xx and status 0 → no response. Extract the classification into a function the tests can call without GJS if `HttpLicenseApiClient` cannot be loaded under Vitest
- [x] A unit test asserts that validation with no response leaves the stored status and license unchanged and keeps a `valid` license enabled
- [x] Unit tests assert that a rejected validation sets `expired` for `LICENSE_EXPIRED`, `LICENSE_CANCELLED`, `DEVICE_DEACTIVATED`, and `invalid` for `INVALID_LICENSE_KEY`, `INVALID_ACTIVATION`
- [x] A unit test asserts that a rejected activation in `trial` status leaves the status `trial` and saves no license, and returns the rejection's message
- [x] A unit test asserts that an activation with no response returns a retryable failure and writes nothing
- [x] `backend_unreachable`, `BACKEND_UNREACHABLE`, `NETWORK_ERROR`, and `UNKNOWN_ERROR` no longer appear in `src/` (grep gate in `check_command`)
