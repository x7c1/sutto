# License Status

## Definition

**License Status** is the current state of the licensing system. It determines whether the user has access to all features.

There are five statuses:

- **trial** — The user is within the [Trial Period](../../trial-period/) and has not activated a [License](../)
- **trial-expired** — The [Trial Period](../../trial-period/) has ended and no [License](../) was activated
- **valid** — The user has an active [License](../) with a valid subscription
- **expired** — The license server reports that the [License](../) subscription ended or was cancelled, or that this device's activation was deactivated (`LICENSE_EXPIRED`, `LICENSE_CANCELLED`, `DEVICE_DEACTIVATED`)
- **invalid** — The license server rejected the [License Key](../license-key/) or the activation (`INVALID_LICENSE_KEY`, `INVALID_ACTIVATION`)

Only an answer from the license server produces **expired** or **invalid**. A [License](../) whose validation got no answer from the license server keeps its status.

## Examples

- A new user who has never activated a License Key has the status "trial"
- A user who activated a License Key with an active subscription has the status "valid"
- A user who used up the Trial Period without activating a License Key has the status "trial-expired"
- A user whose subscription ended last week has the status "expired"

## Collocations

- check (a License Status) — determine the current status
- display (a License Status) — show the status to the user

## Related Concepts

- See [License](../) for the authorization whose state this status represents
- See [Trial Period](../../trial-period/) for the free usage period associated with the "trial" and "trial-expired" statuses
