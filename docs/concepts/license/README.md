# License

## Definition

**License** is a proof of purchase that grants full access to all features.

A License is created when a user activates a [License Key](./license-key/) and contains:
- [License Key](./license-key/) (the identifier used for activation)
- Valid-until date (when the subscription period ends, as last confirmed by the license server)
- Last validated date (when the license was last verified with the server)
- [License Status](./license-status/) (the current state of the licensing system)

## Examples

- A user purchases a subscription, receives a License Key, and activates it to create a License
- A License with a valid-until date of 2026-03-01 shows "Valid until 2026-03-01"; if the license server stops answering, the License keeps working past that date and shows when it was last verified instead
- A License on a device that has been offline for 8 days requires an internet connection again

## Collocations

- activate (a License) — create a License by entering a License Key
- validate (a License) — verify the License with the server
- clear (a License) — remove a License from the device
- renew (a License) — extend the subscription period

## Domain Rules

- **3-device limit**: Each License supports up to 3 device activations. When activated on a 4th device, the oldest activation is automatically deactivated.
- **7-day offline grace period**: A License works offline for up to 7 days after the device was last online, whether or not the license server answered. After that, an internet connection is needed. While online, a License keeps working even when the license server does not answer.
- **No answer is not a rejection**: When the license server does not answer, the stored License and [License Status](./license-status/) stay as they are.
- **The valid-until date is shown, not enforced**: Only an explicit answer from the license server ends a License. A valid-until date in the past does not.
- **A rejected activation changes nothing**: When the license server rejects an activation, nothing stored changes; a user in the [Trial Period](../trial-period/) stays in it.

## Related Concepts

- See [License Key](./license-key/) for the identifier used to activate a License
- See [License Status](./license-status/) for the possible states of the licensing system
- See [Trial Period](../trial-period/) for the free usage period before purchasing a License
