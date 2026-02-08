# Plan: Subscription-based Licensing for sutto

Status: Completed

## Overview

Implement a subscription-based licensing system for sutto. Users will have a 30-day free trial, after which a valid license is required to continue using the extension. The license will be verified via a sutto backend API, which communicates with an external billing provider. This architecture keeps billing service credentials server-side and allows future provider changes without client updates.

## Background

sutto is currently a free, open-source GNOME Shell extension. To sustain ongoing development, a monetization strategy is needed. A low-cost subscription model (e.g., ~$3/month, pricing TBD) with a generous trial period balances accessibility with revenue generation.

## Requirements

### Functional Requirements

- Users can use sutto for 30 days' worth without a license (trial period counts actual usage days, not calendar days)
- After trial expiration, sutto is completely disabled until a valid license is entered
- License is user-based with a limit of 3 device activations
- Users can enter their license key in the Preferences UI
- License validation and activation occurs via sutto backend API (which proxies to billing provider)
- Valid licenses unlock full functionality
- **Graceful degradation**: Extension works normally when offline or backend unreachable

### Non-Functional Requirements

- License validation should not significantly impact extension startup time
- **Graceful degradation**: Extension must work fully when offline or backend unreachable
- License status should be clearly communicated to users
- Backend API must not expose billing service credentials to clients
- Backend stores device-license associations for last-wins enforcement
- Backend should be easily deployable (serverless or lightweight container)

## Technical Approach

Based on ADR decision: Use external billing provider with abstraction layer (see [ADR](./adr.md) for provider selection).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     sutto Extension                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Preferences │  │  License    │  │    Main Extension   │  │
│  │     UI      │──│  Manager    │──│     Controller      │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
│                          │                                  │
│                   ┌──────┴──────┐                           │
│                   │   License   │                           │
│                   │   Storage   │                           │
│                   │  (GSettings)│                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS
                    ┌──────┴──────┐
                    │   sutto    │
                    │ Backend API │
                    └──────┬──────┘
                           │ (credentials server-side)
                    ┌──────┴──────┐
                    │  Billing    │
                    │  Provider   │
                    └─────────────┘
```

**Security benefit**: Billing service API keys/credentials are stored only on the backend server, not embedded in the client extension. This prevents credential extraction and allows switching billing providers without client updates.

### Components

**Extension (Client)**:
- **LicenseManager**: Core service handling license validation, activation, caching, and state
- **LicenseStorage**: Persistence layer using GSettings for license key, activation ID, and validation cache
- **LicenseClient**: HTTP client for sutto backend API communication
- **LicenseUI**: Preferences panel components for license entry, status display, and device management link
- **TrialManager**: Tracks usage days (increments daily on first use of each day)
- **ConnectivityChecker**: Detects network state (online / offline / backend unreachable)

**Backend API**:
- Provides `/v1/license/activate` and `/v1/license/validate` endpoints
- Abstracts billing provider to allow future provider changes
- Implementation details will be decided in the backend repository

### License UI Design

The license UI is added to the existing Preferences window as a new group within the "General" page.

**Page Structure:**
```
General (Adw.PreferencesPage)
├── Keyboard Shortcuts (Adw.PreferencesGroup)  ← existing
│   ├── Show Main Panel
│   └── Open Preferences
└── License (Adw.PreferencesGroup)  ← new
    ├── License Status (Adw.ActionRow)
    └── License Key (Adw.EntryRow)
```

**License Status Row:**

Displays current license state. Content varies by state:

| State | Title | Subtitle |
|-------|-------|----------|
| Trial | "Trial" | "X days remaining" |
| Trial (backend unreachable) | "Trial" | "Server unavailable" |
| Active (verified) | "Active" | "Valid until YYYY-MM-DD" |
| Active (offline) | "Active" | "Offline - connect within X days" |
| Active (backend unreachable) | "Active" | "Server unavailable" |
| Expired (trial) | "Trial Expired" | "Please purchase a license" |
| Expired (subscription) | "Expired" | "Please renew your subscription" |
| Invalid | "Invalid" | Error message from backend |

A "Purchase License" link button is shown when in trial or expired state.

**License Key Row:**

- `Adw.EntryRow` with title "License Key"
- Text entry field for license key input
- "Activate" button as suffix

**Activation Flow:**
```
User enters license key
         │
         ▼
User clicks "Activate"
         │
         ▼
Show spinner, disable button
         │
         ▼
Call LicenseManager.activate()
         │
    ┌────┴────┐
    │         │
 Success    Error
    │         │
    ▼         ▼
Update      Update status row
status      to "Invalid" with
row to      error message
"Active"
```

Feedback is shown persistently in the License Status Row rather than transient toasts.

### API Integration

#### Client → sutto Backend API

**Activation** (first use on a device):
```
POST https://api.sutto.example.com/v1/license/activate
Content-Type: application/json

{
  "license_key": "USER_LICENSE_KEY",
  "device_id": "unique-device-identifier",
  "device_label": "Device name for display"
}
```
Response (200 OK):
```json
{
  "activation_id": "act_xxx",
  "valid_until": "2026-02-28T00:00:00Z",
  "devices_used": 2,
  "devices_limit": 3,
  "deactivated_device": null
}
```

When device limit was exceeded (200 OK with warning):
```json
{
  "activation_id": "act_xxx",
  "valid_until": "2026-02-28T00:00:00Z",
  "devices_used": 3,
  "devices_limit": 3,
  "deactivated_device": "Old Laptop"
}
```

Response (4xx error):
```json
{
  "type": "LICENSE_EXPIRED",
  "expired_on": "2026-01-15T00:00:00Z"
}
```

Error types for activation:
| type | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_LICENSE_KEY` | 404 | License key not found |
| `LICENSE_EXPIRED` | 403 | Subscription has expired |
| `LICENSE_CANCELLED` | 403 | Subscription was cancelled and expired |

**Validation** (subsequent uses):
```
POST https://api.sutto.example.com/v1/license/validate
Content-Type: application/json

{
  "license_key": "USER_LICENSE_KEY",
  "activation_id": "act_xxx"
}
```
Response (200 OK):
```json
{
  "valid_until": "2026-02-28T00:00:00Z",
  "subscription_status": "active"
}
```

Response (4xx error):
```json
{
  "type": "LICENSE_EXPIRED",
  "expired_on": "2026-01-15T00:00:00Z"
}
```

Error types for validation:
| type | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_LICENSE_KEY` | 404 | License key not found |
| `INVALID_ACTIVATION` | 404 | Activation ID not valid for this license |
| `LICENSE_EXPIRED` | 403 | Subscription has expired |
| `LICENSE_CANCELLED` | 403 | Subscription was cancelled and expired |
| `DEVICE_DEACTIVATED` | 403 | This device was deactivated (by last-wins or manual) |

**Error Priority**: When multiple error conditions apply, return the highest priority error:
1. `INVALID_LICENSE_KEY` - license doesn't exist
2. `LICENSE_EXPIRED` - subscription expired (renew needed)
3. `LICENSE_CANCELLED` - subscription cancelled (repurchase needed)
4. `DEVICE_DEACTIVATED` - device removed (re-activation possible)
5. `INVALID_ACTIVATION` - activation ID invalid (re-activation possible)

#### Backend → Billing Provider (server-side only)

The backend communicates with the billing provider using server-stored credentials. The specific API calls depend on the chosen provider (see [ADR](./adr.md)).

This abstraction allows:
- Switching billing providers without client updates
- Adding business logic (e.g., grace periods, special users)
- Rate limiting and abuse prevention

### Data Storage (GSettings)

New keys to add to schema:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `license-key` | string | `""` | User's license key |
| `license-activation-id` | string | `""` | Device activation ID from backend (see note below) |
| `license-valid-until` | int64 | `0` | Cached validation expiry timestamp |
| `license-last-validated` | int64 | `0` | Timestamp of last successful validation |
| `trial-days-used` | int | `0` | Number of days the extension has been used (0-30) |
| `trial-last-used-date` | string | `""` | Last date extension was used (ISO 8601, e.g., "2026-01-31") |
| `license-status` | string | `"trial"` | Current status (see License States) |

**Note**: Device ID is read from `/etc/machine-id` at runtime (no storage needed).

**Note on activation_id**: The `activation_id` returned by the sutto backend is an abstraction over billing provider-specific identifiers. For example, Lemon Squeezy uses `instance_id`. The backend may use a structured format like `LEMON_SQUEEZY:{instance_id}` to enable provider-agnostic handling. The exact format will be decided during backend implementation.

**license-status values** (stored states only):
| Value | Description |
|-------|-------------|
| `trial` | Using free trial period |
| `valid` | License is active and validated |
| `expired` | Trial or subscription expired |
| `invalid` | License key is invalid or deactivated |

### License States

```
┌─────────┐    enter key    ┌────────────┐   success   ┌──────────┐
│  Trial  │ ───────────────▶│ Activating │ ───────────▶│  Valid   │
└────┬────┘                 └─────┬──────┘             └────┬─────┘
     │                            │                         │
     │ 30 days used               │ invalid key /           │ subscription
     ▼                            ▼ expired                 ▼ cancelled
┌─────────┐                 ┌────────────┐            ┌──────────┐
│ Expired │                 │   Error    │            │ Expired  │
│(disabled)│                │  (retry)   │            │(disabled)│
└─────────┘                 └────────────┘            └──────────┘
```

**Trial Expired**: Extension is completely disabled after 30 usage days. User sees message to purchase license.
**Activation Error (invalid)**: Invalid key, expired subscription, or device deactivated. User can retry with correct key or re-activate.
**Note**: Device limit does not cause error; last-wins strategy auto-deactivates oldest device.

### Network State Handling

The extension distinguishes between two failure modes:

| State | Network | Backend | Description |
|-------|---------|---------|-------------|
| **Online** | ✅ | ✅ | Normal operation |
| **Offline** | ❌ | - | User has no network connectivity |
| **Backend Unreachable** | ✅ | ❌ | Network available but backend is down |

**Behavior by state:**

```
Online:
  → Validate license with backend
  → Cache result locally
  → Increment usage days if in trial mode

Offline (user has no network):
  → Calculate time since last validation: `now - license-last-validated`
  → If diff < 7 days:
      → Allow usage (ignore `valid_until` to accommodate clock skew)
      → Increment usage days
  → If diff >= 7 days:
      → Disable extension ("Please connect to internet to verify license")

Backend Unreachable (network available, backend down):
  → Allow usage (fail-open, no time limit)
  → Do NOT increment usage days (not user's fault)
```

**Detection method:**
- Use NetworkManager / GLib network monitoring to detect connectivity
- Fallback: probe known public endpoint (e.g., `http://nmcheck.gnome.org/check_network_status.txt`)
- If network is up but backend request fails → Backend Unreachable
- If network is down → Offline

**Rationale:**
- **Offline**: User chose to work without network; usage days count; limited to 7 days to prevent indefinite offline use
- **Backend Unreachable**: Service failure outside user's control; should not penalize user; no time limit
- If backend becomes permanently unavailable, existing users are not locked out (fail-open design)

### Validation Frequency

License validation occurs at:
- **Extension startup**: When GNOME Shell loads the extension
- **Daily**: Once per 24 hours while extension is running

```
on_startup:
  validate_license()
  schedule_daily_check()

on_daily_check:
  if (now - last_validation >= 24 hours):
    validate_license()
```

This balances API load minimization with timely detection of subscription changes.

### Device Limit Enforcement (Last-Wins)

The backend stores associations between license keys and device IDs (machine-id). When a user activates a new device and the limit (3 devices) is already reached:

```
Activation request for Device D:
  → Count active devices for this license in backend storage
  → If count >= 3:
      → Remove oldest device from association (by activation timestamp)
  → Associate Device D with license
  → Proxy activation to billing provider
  → Return success
```

When an old device validates its license, the backend checks its storage and returns `DEVICE_DEACTIVATED` if the device is no longer associated.

**Notes**:
- **Implementation Detail**: When the sutto backend deactivates an old device from its own storage, it must also call the billing provider's API (e.g., Lemon Squeezy `deactivate`) to ensure consistency. If the deactivate API call fails, the backend should handle this gracefully (e.g., retry, log for manual review, or accept minor inconsistency). This is out of scope for this plan and will be addressed during backend implementation.
- Due to client-side caching (24-hour validation interval), the deactivated device may continue working until its next validation check. This is acceptable as a trade-off for simplicity.
- If the user re-enters the license key on a deactivated device, it will be re-activated (triggering last-wins again if at limit). This is intentional - the system is designed to support willing users, not to prevent determined circumvention.

### Rate Limiting (Initial Release)

In the initial release, the extension does not need to handle rate limiting errors. If the backend receives a 429 (Too Many Requests) from the billing provider, it treats it as a successful validation and returns a valid response to the extension. At launch, the user base will be small enough that rate limits are unlikely to be hit.

For future scaling considerations, see [Backend Rate Limiting Strategy](./backend-rate-limiting.md).

### Abuse Detection (Future)

Not implemented in initial release. See [ADR](./adr.md) for details on detection approach when user base grows.

### Device Management UI (Future)

Not implemented in initial release. In future versions, the Preferences UI could display a list of activated devices:

- Show device label, activation date, and last validation time
- Allow users to deactivate devices directly from sutto (requires new backend endpoint)
- This would use the `device_label` field to identify devices in the list

For initial release, users can manage devices via the billing provider's customer portal or by re-entering their license key (triggering last-wins).

## Implementation Tasks

### Phase 1: Backend API (10 points)

- Design and implement backend API project structure
- Implement license activation endpoint (with last-wins device limit)
- Implement license validation endpoint
- Add unit tests for backend logic
- Deploy to hosting platform (Cloudflare Workers, Vercel, etc.)

### Phase 2: Extension Core Infrastructure (8 points)

- Create GSettings schema additions for license data
- Implement LicenseStorage service for persistence
- Implement LicenseClient service for backend API calls
- Implement LicenseManager coordinating validation logic
- Implement TrialManager for trial period tracking
- Add unit tests for license logic

### Phase 3: Extension UI Integration (5 points)

- Add license key entry field to Preferences
- Add license status display (usage days remaining, valid, expired)
- Add "Purchase License" link/button
- Show appropriate messaging based on license state
- Handle license entry validation feedback

### Phase 4: Extension Integration (6 points)

- Integrate LicenseManager with main Controller
- Implement startup license check flow (non-blocking, offline-first)
- Handle trial expired behavior (disable extension after 30 usage days)
- Show "license required" overlay/message when disabled
- Implement network state detection (online / offline / backend unreachable)
- Implement fail-open behavior and conditional trial counting

### Phase 5: Billing Provider Setup (3 points)

- Create account with chosen billing provider
- Configure product with subscription pricing (~$3/month)
- Set up license key generation (activation limit: unlimited or high number)
  - Device limit is managed by sutto backend, not billing provider
  - This allows consistent behavior across different billing providers
- Configure webhook for subscription events (optional)
- Test end-to-end purchase flow

### Phase 6: Polish & Documentation (3 points)

- User documentation for license purchase process
- Error message improvements
- Edge case handling (timezone issues, clock skew)
- Final testing across scenarios

## Timeline

Total estimated effort: 35 points

## Decisions Made

- **Architecture**: Backend API mediates between client and billing service (client never talks directly to billing provider)
- **Trial period**: 30 days' worth (counts actual usage days, not calendar days)
- **Trial expiration behavior**: Extension is completely disabled (no feature-limited free tier)
- **License model**: User-based with 3-device activation limit (last-wins: new activation auto-deactivates oldest device)
- **Device management**: Users can also manually deactivate devices via billing provider's customer portal
- **Fail-open on backend unreachable**: Extension works normally when backend is down; ensures users aren't locked out if backend is discontinued; usage days do NOT count
- **Offline usage**: Extension works for up to 7 days since last successful validation; usage days count; after 7 days, requires online validation
- **Device identifier**: Use `/etc/machine-id` (read at runtime, no storage needed)
- **Device label**: Use pretty hostname from `/etc/machine-info` (`PRETTY_HOSTNAME`), fallback to `GLib.get_host_name()`. Truncate to 64 characters max to handle arbitrarily long hostnames.
- **Validation frequency**: On extension startup + once per 24 hours while running

## Open Questions

- Backend hosting platform? (Cloudflare Workers, Vercel, AWS Lambda, etc.)
- Backend technology stack? (Node.js, Go, Rust, etc.)
- Security validations (store_id, product_id verification)

Note: Backend decisions will be made in a separate backend repository.

## Risks

- **Extension review**: No precedent for subscription model on extensions.gnome.org; no explicit prohibition found, but reviewer discretion applies
- **User friction**: Licensing may deter open-source users; mitigate with generous trial and fair pricing
- **License bypass**: Designed to support willing users, not to prevent determined bypass; fail-open ensures good UX

## References

- [ADR: Billing Platform Selection](./adr.md)

## Appendix: Extension Review Policy Research

Research conducted to assess whether subscription-based licensing is permitted on extensions.gnome.org.

### Findings

| Source | Mentions paid/subscription model? |
|--------|-----------------------------------|
| Official Review Guidelines | No |
| GNOME Discourse | No |
| GNOME Wiki Archive | No |

**No explicit prohibition found**, but also no precedent exists.

### Relevant Policies

- **License requirement**: Extensions must be distributed under GPLv2+ ([source](https://discourse.gnome.org/t/gplv3-extension-and-extensions-gnome-org/6506))
- **Donation support**: Official metadata field supports donation links (Buy Me a Coffee, Ko-fi, Patreon, PayPal, GitHub Sponsors) ([source](https://www.omglinux.com/gnome-extensions-support-donations/))
- **AI-generated code**: Prohibited as of December 2025 ([source](https://blogs.gnome.org/jrahmatzadeh/2025/12/06/ai-and-gnome-shell-extensions/))

### GPL and Commercial Use

GPL does not prohibit charging money; it requires source code availability. A subscription model with open source code is not a GPL violation. However, license enforcement mechanisms could be interpreted as restricting GPL freedoms.

### Conclusion

Subscription model approval is at reviewer discretion. Consider asking on [GNOME Discourse](https://discourse.gnome.org/) before implementation if certainty is needed.

### Sources

- [GNOME Shell Extensions Review Guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html)
- [GPLv3 extension and extensions.gnome.org - GNOME Discourse](https://discourse.gnome.org/t/gplv3-extension-and-extensions-gnome-org/6506)
- [Donating to GNOME Extension Devs Made Easier - OMG! Linux](https://www.omglinux.com/gnome-extensions-support-donations/)
- [AI and GNOME Shell Extensions - GNOME Blog](https://blogs.gnome.org/jrahmatzadeh/2025/12/06/ai-and-gnome-shell-extensions/)
