# ADR: Subscription Billing Platform Selection

## Overview

This document evaluates billing platforms for implementing subscription-based licensing in sutto, a GNOME Shell extension. The primary requirements are low transaction fees for micro-subscriptions ($2-3/month), built-in license key management, and compatibility with desktop application verification.

## Status

Proposed

## Context

sutto needs a monetization strategy to sustain development. The requirements are:

- Subscription-based licensing ($2-3/month range, pricing TBD)
- 30-day free trial period
- License verification via backend API (client → sutto backend → billing provider)
- Backend abstracts billing provider to allow future changes without client updates
- Global tax compliance (VAT, sales tax handling)

**Architecture constraint**: The client must not directly communicate with the billing service. A backend API layer is required to:
- Keep billing service credentials server-side (security)
- Enable switching billing providers without client updates (flexibility)
- Add custom business logic (grace periods, special users, etc.)

## Options Considered

### Option 1: Polar.sh

Pricing: https://polar.sh/resources/pricing

**Description**: Open-source billing platform designed for developers, acts as Merchant of Record (MoR).

**Pros**:
- Lowest MoR fees: 4% + $0.40 per transaction (~17% for $3/month)
- Built-in license key generation and management
- Well-documented API for backend integration
- Activation limits and expiration support built-in
- Handles global tax compliance (VAT, GST, sales tax)
- Open-source platform
- Customer portal for self-service license management (device deactivation, key retrieval)

**Cons**:
- Newer platform, less established than alternatives
- Smaller community and fewer integrations
- Limited documentation compared to larger platforms

### Option 2: Gumroad

Pricing: https://gumroad.com/pricing

**Description**: Established platform for selling digital products, acts as MoR.

**Pros**:
- Well-established with large user base
- Simple setup process
- License key support
- Handles tax compliance

**Cons**:
- High fees: 10% + $0.50 + payment processing (~40% for $3/month)
- Fee structure makes micro-subscriptions impractical
- Less developer-focused API

### Option 3: Lemon Squeezy

Pricing: https://www.lemonsqueezy.com/pricing

**Description**: Modern digital commerce platform, acquired by Stripe in 2024, acts as MoR.

**Pros**:
- Lower fees than Gumroad: 5% + $0.50 (~22% for $3/month)
- Good documentation and developer experience
- Stripe backing provides stability
- License key support
- **PayPal support** - Enables purchases from privacy-conscious users who hesitate to enter credit card info on unfamiliar sites
- Email delivery of license keys (automatic receipt with key)
- Customer portal for subscription management

**Cons**:
- Higher fees than Polar.sh (5% vs 4%, +$0.10 fixed)
- Additional fees: +1.5% international, +2% PayPal
- Fixed fee component still significant for low-price subscriptions
- No custom license key prefix (UUID format only)
- Limited customer self-service for device deactivation

### Option 4: GitHub Sponsors

Fees: https://docs.github.com/en/sponsors/sponsoring-open-source-contributors/about-sponsorships-fees-and-taxes

**Description**: GitHub's sponsorship platform for open-source developers.

**Pros**:
- 0% fees for personal accounts
- Strong alignment with open-source community
- Trusted platform

**Cons**:
- No built-in license key system
- Requires custom backend to verify sponsor status via GraphQL API
- Sponsor verification requires GitHub authentication
- Doesn't scale well for commercial licensing model

### Option 5: Direct Stripe Integration

Pricing: https://stripe.com/pricing

**Description**: Build custom billing using Stripe directly.

**Pros**:
- Lower per-transaction fees: 2.9% + $0.30
- Full control over billing logic
- Mature, reliable platform

**Cons**:
- Not a MoR - responsible for own tax compliance globally
- Must build license key system from scratch
- Must build customer portal
- Significant development overhead
- Ongoing maintenance burden

## Fee Comparison Summary

| Platform | Fee Structure | $1/month | $2/month | $3/month | MoR | License Keys | PayPal |
|----------|---------------|----------|----------|----------|-----|--------------|--------|
| Polar.sh | 4% + $0.40 | $0.44 (44%) | $0.48 (24%) | $0.52 (17%) | Yes | Built-in | No |
| Lemon Squeezy | 5% + $0.50 | $0.55 (55%) | $0.60 (30%) | $0.65 (22%) | Yes | Built-in | Yes (+2%) |
| Gumroad | 10% + $0.50 + processing | $0.93 (93%) | $1.06 (53%) | $1.19 (40%) | Yes | Built-in | Yes |
| GitHub Sponsors | 0% | $0 (0%) | $0 (0%) | $0 (0%) | No | None | No |
| Stripe Direct | 2.9% + $0.30 | $0.33 (33%) | $0.36 (18%) | $0.39 (13%) | No | None | Yes |

**Note**: Lemon Squeezy also charges +1.5% for international (non-US) transactions.

### Developer Take-Home

| Platform | $1/month | $2/month | $3/month |
|----------|----------|----------|----------|
| Polar.sh | $0.56 | $1.52 | $2.48 |
| Lemon Squeezy (US, Card) | $0.45 | $1.40 | $2.35 |
| Lemon Squeezy (Intl, Card) | $0.44 | $1.37 | $2.30 |
| Lemon Squeezy (US, PayPal) | $0.43 | $1.36 | $2.29 |
| Lemon Squeezy (Intl, PayPal) | $0.42 | $1.33 | $2.24 |
| Gumroad | $0.07 | $0.94 | $1.81 |
| GitHub Sponsors | $1.00 | $2.00 | $3.00 |
| Stripe Direct | $0.67 | $1.64 | $2.61 |

## Decision

**Selected: Option 3 - Lemon Squeezy**

## Rationale

- **PayPal support is critical for the target audience**: GNOME users are globally distributed and privacy-conscious. Many hesitate to enter credit card info on unfamiliar foreign sites. PayPal acts as a trusted intermediary, protecting card details. Without PayPal, potential customers may not purchase at all.
- **Built-in license key infrastructure**: Eliminates need to build and maintain custom license key generation and management
- **Email delivery of license keys**: Customers receive their license key automatically in the receipt email, providing a better UX than requiring portal login
- **Good API for backend integration**: Well-documented License API for activation, validation, and deactivation
- **MoR status**: Handles global tax compliance, removing significant legal and administrative burden
- **Stripe backing**: Acquired by Stripe in 2024, providing long-term stability

**Fee comparison with Polar.sh**:

| Provider | Customer | Payment | $2/month | $3/month |
|----------|----------|---------|----------|----------|
| Polar.sh | All | Card | $1.52 | $2.48 |
| Lemon Squeezy | US | Card | $1.40 | $2.35 |
| Lemon Squeezy | International | Card | $1.37 | $2.30 |
| Lemon Squeezy | US | PayPal | $1.36 | $2.29 |
| Lemon Squeezy | International | PayPal | $1.33 | $2.24 |

The fee difference is acceptable given:
1. PayPal enables purchases from users who would otherwise not buy
2. Email delivery provides better UX than portal-only access
3. Stripe backing provides platform stability

### Pricing Strategy (TBD)

The final pricing is not yet decided. Options under consideration:

| Strategy | Description |
|----------|-------------|
| **Single tier ($2/month)** | Lower barrier to entry, maximizes user base |
| **Single tier ($3/month)** | Higher revenue per user, still affordable |
| **Two tiers ($2 + $3/month)** | Standard tier + "Supporter" tier for users who want to contribute more |

The two-tier approach allows price-sensitive users to access the extension at $2/month while giving supporters an option to pay more. Both tiers would have identical functionality.

While GitHub Sponsors has 0% fees, the lack of license key infrastructure and requirement for GitHub authentication makes it unsuitable for a commercial trial-based licensing model.

**Note**: The backend abstracts the billing provider. Switching to another provider (Polar.sh, Stripe, etc.) requires only backend changes, with no client updates.

## Consequences

**Positive**:
- Tax compliance handled automatically by MoR
- Built-in license key management reduces implementation effort
- PayPal support increases potential customer base
- Email delivery of license keys improves customer experience
- Stripe backing provides long-term platform stability
- Backend abstraction allows provider switching without client updates

**Negative**:
- Requires building and hosting a backend API
- Dependency on third-party billing platform
- Higher fees than Polar.sh (~10% more per transaction)
- No custom license key prefix (UUID format only)
- Limited customer self-service for device deactivation (requires last-wins strategy or support)

**Mitigations**:
- Backend abstracts Lemon Squeezy, enabling future provider migration
- Cache license validation results on client to handle backend/provider outages
- Implement last-wins device activation strategy to minimize support burden for device management

## Future Considerations

### Abuse Detection

Not implemented in initial release. When user base grows, consider adding validation logging and abuse detection:

```
Validation log entry:
{
  license_key: "xxx",
  activation_id: "act_123",
  device_id: "device-abc",
  timestamp: "2026-01-31T10:00:00Z"
}
```

**Detection logic**:
```sql
SELECT COUNT(DISTINCT activation_id)
FROM validation_logs
WHERE license_key = ?
  AND timestamp > NOW() - INTERVAL 48 HOURS

-- If count > device_limit, flag for review
```

This would detect users exploiting the 24-hour validation cache to exceed the device limit.
