# Trial Period

## Definition

**Trial Period** is a free period that grants full access to all features without requiring a [License](../license/).

Usage days are counted based on actual usage — only days when the user uses the application count toward the limit, with a maximum of one day counted per calendar day.

## Examples

- A user installs the application and begins a Trial Period
- A user who uses the application on Monday and Tuesday has two fewer days remaining, regardless of how many calendar days pass between uses
- A user who opens the application twice on the same day still has only one usage day counted

## Collocations

- record (a usage day in the Trial Period) — count a day of usage

## Domain Rules

- **Recording a usage day**: A usage day is recorded when the user triggers the [Main Panel](../main-panel/); logging in or unlocking the screen does not count. Recording the day that reaches the limit ends the Trial Period at that same trigger, and the [License Status](../license/license-status/) becomes "trial-expired".
- **An ended trial opens when the license server is gone**: After the Trial Period has ended, the application asks the license server at startup whether it is there. While the license server answers, an ended Trial Period stays locked; once it no longer answers, the application works again, with the same 7-day offline grace period as a [License](../license/). Retiring the license server never strands anyone.
- **Pre-expiry warning**: The user is notified when the remaining days first drop to 3 or fewer, and again when they drop to 1, so the end of the Trial Period is never a surprise. Each of the two thresholds notifies at most once, including across logins; a threshold already passed when the first notification fires is never notified about afterwards.

## Related Concepts

- See [License](../license/) for the subscription-based authorization that follows the Trial Period
- See [License Status](../license/license-status/) for the "trial" status associated with an active Trial Period and the "trial-expired" status that follows it
