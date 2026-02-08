# Purchase Flow Research: Polar

## Overview

This document details the purchase flow for Polar, from the user clicking "Purchase License" to license key delivery and ongoing management. Polar is a developer-focused billing platform with built-in software licensing capabilities.

## Purchase Flow

```
User clicks "Purchase License"
         │
         ▼
┌─────────────────────────────────────┐
│  Checkout (3 options)               │
│  - Checkout Link (hosted page)      │
│  - Embedded Checkout (iframe)       │
│  - Checkout API (custom flow)       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Payment Processing                 │
│  - Multiple payment methods         │
│  - Real-time tax calculation        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Automatic License Key Generation   │
│  - Unique key per customer          │
│  - Customizable prefix (e.g.        │
│    SUTTO_XXXXXXXX)                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  License Key Delivery               │
│  - Instant access after payment     │
│  - Available in Purchases page      │
└─────────────────────────────────────┘
```

## Checkout Options

### 1. Checkout Link (No-code)

Hosted checkout page that can be created and shared instantly without technical setup.

**Use case**: Simple integration, share link via website button or email.

### 2. Embedded Checkout (iframe)

Checkout embedded seamlessly into your website with customizable branding. Customers stay within the merchant's domain.

**Use case**: Better user experience, consistent branding.

### 3. Checkout API

Programmatically create dynamic checkout sessions for fully custom flows.

**Use case**: Advanced integration, custom purchase flows.

## License Key Features

| Feature | Description |
|---------|-------------|
| **Custom Prefix** | Keys can be branded (e.g., `SUTTO_<UUID4>`) |
| **Automatic Expiration** | Expire after N days, months, or years |
| **Activation Limits** | Limit usage to N devices/IPs/conditions |
| **Usage Quotas** | Track consumption per key (for metered billing) |
| **Auto-revoke** | Automatically revoked when subscription is cancelled |

## License Key API

**Base URL**: `https://api.polar.sh/v1/customer-portal/license-keys`

### Activate License Key

**Endpoint**: `POST /activate`

**Request**:
```json
{
  "key": "SUTTO_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "organization_id": "org_xxx",
  "label": "My Desktop",
  "conditions": {
    "device_id": "unique-machine-id"
  }
}
```

**Response** (Success):
```json
{
  "id": "act_xxx",
  "license_key_id": "lk_xxx",
  "label": "My Desktop",
  "conditions": {
    "device_id": "unique-machine-id"
  },
  "meta": {}
}
```

### Validate License Key

**Endpoint**: `POST /validate`

**Request**:
```json
{
  "key": "SUTTO_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "organization_id": "org_xxx",
  "activation_id": "act_xxx",
  "conditions": {
    "device_id": "unique-machine-id"
  }
}
```

**Response** (Success):
```json
{
  "id": "lk_xxx",
  "organization_id": "org_xxx",
  "status": "granted",
  "limit_activations": 3,
  "usage": 0,
  "limit_usage": null,
  "validations": 5,
  "last_validated_at": "2026-01-31T12:00:00Z",
  "expires_at": "2026-02-28T00:00:00Z"
}
```

### Deactivate License Key

**Endpoint**: `POST /deactivate`

**Request**:
```json
{
  "key": "SUTTO_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  "organization_id": "org_xxx",
  "activation_id": "act_xxx"
}
```

### Security Note

`organization_id` is **required** in all API calls to prevent cross-organization license key misuse.

## License Key States

| State | Description |
|-------|-------------|
| `granted` | License is valid and usable |
| `revoked` | Subscription cancelled or manually revoked |

Expiration is tracked separately via `expires_at` field.

## Subscription Integration

- License keys are automatically generated upon subscription purchase
- Keys are automatically revoked when subscription is cancelled
- Expiration can be set independently or tied to subscription billing cycle

## Customer Portal

Customers access their licenses via a **Purchases page** where they can:

- View and copy their license key
- See expiration date and remaining time
- Check remaining usage (if quotas enabled)
- **Deactivate device instances** (if enabled by merchant)

The self-service device management is a key advantage - users can free up device slots without contacting support.

## Pricing (2026)

| Fee Type | Amount |
|----------|--------|
| **Transaction Fee** | 4% + $0.40 |
| **Monthly Fee** | None |

### Fee Calculation for $3/month subscription

- Transaction fee: $3.00 × 4% + $0.40 = **$0.52**
- Net revenue: **$2.48** per transaction

### Comparison with Lemon Squeezy

| Provider | Customer | Payment | Fee | Net Revenue |
|----------|----------|---------|-----|-------------|
| **Polar** | All | Card | $0.52 | **$2.48** |
| Lemon Squeezy | US | Card | $0.65 | $2.35 |
| Lemon Squeezy | International | Card | $0.70 | $2.30 |
| Lemon Squeezy | US | PayPal | $0.71 | $2.29 |
| Lemon Squeezy | International | PayPal | $0.76 | $2.24 |

**Note**: Polar does not support PayPal. Lemon Squeezy charges +1.5% for international, +2% for PayPal.

## Implementation for sutto Backend

### Required Backend Endpoints

```
POST /v1/license/activate
  → Proxy to Polar /activate
  → Verify organization_id
  → Return activation_id

POST /v1/license/validate
  → Proxy to Polar /validate
  → Verify organization_id
  → Return validation result
```

### Configuration

```env
POLAR_ORGANIZATION_ID=org_xxx
POLAR_API_KEY=polar_xxx  # Server-side only
```

### Advantages for sutto

1. **Lower fees** - Better margin on $3/month price point ($2.48 vs $2.35)
2. **Custom key prefix** - `SUTTO_xxx` format for brand recognition
3. **Customer self-service** - Users can deactivate devices without support
4. **Developer-focused** - Aligns with target audience
5. **Usage quotas** - Flexibility for future metered features

### Considerations

1. No automatic email delivery of license key (customers access via portal)
2. Smaller ecosystem compared to established platforms
3. **No PayPal support** - This is a significant limitation for sutto's target audience:
   - GNOME users are globally distributed and privacy-conscious
   - Many international users hesitate to enter credit card info on unfamiliar foreign sites
   - PayPal acts as a trusted intermediary, protecting card details
   - Without PayPal, some potential customers may not purchase at all

## Sources

- [Polar Documentation](https://polar.sh/docs/introduction)
- [Polar License Keys](https://polar.sh/docs/features/benefits/license-keys)
- [Polar License Key API](https://polar.apidocumentation.com/documentation/features/benefits/license-keys)
- [Activate License Key API](https://docs.polar.sh/api-reference/customer-portal/license-keys/activate)
- [Software License Management with Polar.sh](https://skatkov.com/posts/2025-05-11-software-license-management-for-dummies)
