# Purchase Flow Research: Lemon Squeezy

## Overview

This document details the purchase flow for Lemon Squeezy, from the user clicking "Purchase License" to license key delivery and ongoing management. Lemon Squeezy is an established merchant of record platform with comprehensive software licensing features.

## Purchase Flow

```
User clicks "Purchase License"
         │
         ▼
┌─────────────────────────────────────┐
│  Checkout (3 options)               │
│  - Hosted Checkout (dedicated page) │
│  - Checkout Overlay (modal)         │
│  - Checkout API (custom flow)       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Payment Processing                 │
│  - Multiple payment methods         │
│  - PayPal supported                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Automatic License Key Generation   │
│  - UUID format key                  │
│  - Configurable activation limit    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  License Key Delivery               │
│  - Email receipt with license key   │
│  - My Orders page access            │
│  - Optional: redirect URL with      │
│    [license_key] variable           │
└─────────────────────────────────────┘
```

## Checkout Options

### 1. Hosted Checkout

Dedicated checkout page hosted by Lemon Squeezy.

**Use case**: Simple integration, no frontend work needed.

### 2. Checkout Overlay

Embedded modal that appears on your website.

**Use case**: Keep users on your site, better conversion.

### 3. Checkout API

Build completely customized checkout experience via API.

**Use case**: Full control over purchase flow.

## License Key Features

| Feature | Description |
|---------|-------------|
| **Activation Limit** | Limit usage to N devices/instances |
| **License Length** | Set validity period (non-subscription only) |
| **Subscription Tied** | Key expires when subscription expires |
| **Email Delivery** | Key automatically sent in receipt email |
| **Redirect URL** | Pass key via `[license_key]` URL variable |

## License Key Delivery Methods

### 1. Email Receipt

License key is automatically included in the order receipt email sent to the customer.

### 2. My Orders Page

Customers can view their license key at `https://app.lemonsqueezy.com/my-orders` after logging in.

### 3. Redirect URL (Optional)

Configure a redirect URL with the `[license_key]` placeholder:

```
https://sutto.example.com/activate?key=[license_key]
```

After purchase, customer is redirected with the actual key in the URL.

## License API

**Base URL**: `https://api.lemonsqueezy.com/v1/licenses`

**Content-Type**: `application/x-www-form-urlencoded`

**Rate Limit**: 60 requests per minute

### Activate License Key

**Endpoint**: `POST /activate`

**Request** (form-urlencoded):
```
license_key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
instance_name=My Desktop
```

**Response** (Success - 200):
```json
{
  "activated": true,
  "error": null,
  "license_key": {
    "id": 123,
    "status": "active",
    "key": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "activation_limit": 3,
    "activation_usage": 1,
    "created_at": "2026-01-01T00:00:00Z",
    "expires_at": "2026-02-28T00:00:00Z"
  },
  "instance": {
    "id": "ins_xxx",
    "name": "My Desktop",
    "created_at": "2026-01-31T12:00:00Z"
  },
  "meta": {
    "store_id": 123,
    "order_id": 456,
    "product_id": 789,
    "product_name": "sutto Pro",
    "variant_id": 101,
    "variant_name": "Monthly",
    "customer_id": 202,
    "customer_name": "John Doe",
    "customer_email": "john@example.com"
  }
}
```

**Response** (Activation limit reached):
```json
{
  "activated": false,
  "error": "This license key has reached the activation limit.",
  "license_key": { ... },
  "meta": { ... }
}
```

### Validate License Key

**Endpoint**: `POST /validate`

**Request** (form-urlencoded):
```
license_key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
instance_id=ins_xxx
```

**Response** (Success - 200):
```json
{
  "valid": true,
  "error": null,
  "license_key": {
    "id": 123,
    "status": "active",
    "key": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "activation_limit": 3,
    "activation_usage": 1,
    "expires_at": "2026-02-28T00:00:00Z"
  },
  "instance": {
    "id": "ins_xxx",
    "name": "My Desktop"
  },
  "meta": { ... }
}
```

### Deactivate License Key

**Endpoint**: `POST /deactivate`

**Request** (form-urlencoded):
```
license_key=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
instance_id=ins_xxx
```

### Security Note

Always verify `store_id`, `product_id`, and/or `variant_id` from the response to prevent license key misuse from other Lemon Squeezy products. These IDs should be verified in the backend, not the client.

### Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 400 | General error (see `error` field) |
| 404 | License key not found |
| 422 | Missing or invalid required fields |

## License Key States

| State | Description |
|-------|-------------|
| `inactive` | Valid but never activated |
| `active` | Has one or more device activations |
| `expired` | Validity period has passed |
| `disabled` | Manually disabled from dashboard |

## Subscription Integration

For subscription products:
- License key is generated on initial purchase
- **No separate "license length" setting** - validity tied to subscription
- Key remains active as long as subscription is active
- Key expires when:
  - Subscription is cancelled and reaches end of billing cycle
  - Payment fails and cannot be retried

## Customer Portal

### My Orders (Global)

URL: `https://app.lemonsqueezy.com/my-orders`

- Global account across all Lemon Squeezy stores
- View all orders and subscriptions
- Access license keys and downloadable files
- Login via magic link (email)

### Customer Portal (Store-specific)

URL: `https://[store].lemonsqueezy.com/billing`

Features:
- View active and expired subscriptions
- Access license keys and downloadable files
- View billing history and invoices
- Manage subscriptions (pause, cancel, resume)
- Update payment methods
- Access via magic link or signed API URL

### Signed URL Access

Generate authenticated portal URLs via API for seamless customer access without login:

```
GET /v1/customers/{id}/portal-url
```

## Pricing (2026)

| Fee Type | Amount |
|----------|--------|
| **Base Transaction Fee** | 5% + $0.50 |
| **International (non-US)** | +1.5% |
| **PayPal** | +2% |
| **Affiliate Referral** | +3% |
| **Abandoned Cart Recovery** | +5% |
| **Monthly Fee** | None |

### Fee Calculation for $3/month subscription

| Customer | Payment | Fee Calculation | Fee | Net Revenue |
|----------|---------|-----------------|-----|-------------|
| US | Card | $3 × 5% + $0.50 | $0.65 | **$2.35** |
| International | Card | $3 × 6.5% + $0.50 | $0.70 | **$2.30** |
| US | PayPal | $3 × 7% + $0.50 | $0.71 | **$2.29** |
| International | PayPal | $3 × 8.5% + $0.50 | $0.76 | **$2.24** |

**Note**: PayPal adds +2% to the base fee. International adds +1.5%.

## Implementation for sutto Backend

### Required Backend Endpoints

```
POST /v1/license/activate
  → Proxy to Lemon Squeezy /activate
  → Verify store_id, product_id
  → Return instance_id

POST /v1/license/validate
  → Proxy to Lemon Squeezy /validate
  → Verify store_id, product_id
  → Return validation result
```

### Configuration

```env
LEMONSQUEEZY_STORE_ID=123
LEMONSQUEEZY_PRODUCT_ID=456
LEMONSQUEEZY_API_KEY=xxx  # Server-side only (for admin operations)
```

Note: License API (activate/validate) does not require API key authentication - it uses the license key itself for auth.

### Advantages for sutto

1. **Email delivery** - License key sent automatically in receipt
2. **Redirect URL** - Can redirect to sutto site with key in URL for seamless onboarding
3. **Established platform** - Larger ecosystem, more documentation
4. **PayPal support** - See below for details
5. **Customer portal** - Rich self-service for subscription management

### Why PayPal Support Matters

PayPal support is a significant advantage for sutto's target audience:

**Security perspective:**
```
Credit card direct:
  User → Card info → Lemon Squeezy → Payment network
              ↑
        Info stored here (concern for some users)

PayPal:
  User → PayPal auth → Lemon Squeezy → Payment network
              ↑
        No card info shared (peace of mind)
```

**GNOME user characteristics:**
- Globally distributed (many international users)
- Tech-savvy and privacy-conscious
- May hesitate to enter credit card info on unfamiliar foreign sites

**Business impact:**
- PayPal enables purchases from users who would otherwise not buy
- The ~10% fee difference ($2.48 vs $2.24) may be offset by increased conversions
- sutto implementation is identical regardless of payment method - only payout amount differs

### Considerations

1. Higher transaction fees (5% vs 4%)
2. No custom key prefix (UUID format only)
3. Limited customer self-service for device deactivation
4. Rate limit of 60 requests/minute

## Sources

- [Lemon Squeezy Licensing](https://docs.lemonsqueezy.com/help/licensing)
- [Generating License Keys](https://docs.lemonsqueezy.com/help/licensing/generating-license-keys)
- [License API](https://docs.lemonsqueezy.com/api/license-api)
- [Activate License Key API](https://docs.lemonsqueezy.com/api/license-api/activate-license-key)
- [License Keys and Subscriptions](https://docs.lemonsqueezy.com/help/licensing/license-keys-subscriptions)
- [Customer Portal](https://docs.lemonsqueezy.com/help/online-store/customer-portal)
- [Lemon Squeezy Pricing](https://www.lemonsqueezy.com/pricing)
