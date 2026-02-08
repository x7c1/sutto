# Backend Rate Limiting Strategy

## Overview

This document describes how the sutto backend handles LS (LS) API rate limits. The License API has a limit of 60 requests per minute, which requires caching and rate limiting strategies to support a growing user base.

**Status**: Future consideration. Not implemented in initial release.

## LS Rate Limits

| API | Limit | Source |
|-----|-------|--------|
| License API (activate/validate/deactivate) | 60 requests/minute | [LS Docs](https://docs.lemonsqueezy.com/api/license-api) |

## Problem Scenario

```
Example: 1000 sutto users

All users start GNOME Shell at similar times (e.g., 9:00 AM workday start):
  → 1000 validation requests within seconds
  → Exceeds 60/min limit by ~16x
  → Mass 429 (Too Many Requests) errors
  → Users see "license validation failed" errors
```

### Worst Case: Burst Traffic

The 60 requests/minute limit means **only 60 users can be served per minute** in the worst case:

```
Monday 9:00 AM - Everyone starts work

User 1-60:    → Success (first minute)
User 61-120:  → Must wait or error (next minute)
User 121-180: → Wait longer...
User 1000:    → ~17 minutes wait
```

Even with caching, if the cache is empty or expired, all users hit the LS API simultaneously.

## Solution: Backend Caching Layer

```
┌──────────────────────────────────────────────────────────────┐
│                      sutto Backend                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Request from client                                          │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐   hit    ┌─────────────────────────────┐   │
│  │    Cache    │ ────────▶│ Return cached result        │   │
│  │   Lookup    │          │ (no API call)               │   │
│  └──────┬──────┘          └─────────────────────────────┘   │
│         │ miss                                                │
│         ▼                                                     │
│  ┌─────────────┐          ┌─────────────────────────────┐   │
│  │ Rate Limit  │ exceeded │ Return cached result        │   │
│  │   Check     │ ────────▶│ or queue for later          │   │
│  └──────┬──────┘          └─────────────────────────────┘   │
│         │ ok                                                  │
│         ▼                                                     │
│  ┌─────────────┐          ┌─────────────────────────────┐   │
│  │ Lemon       │          │ Cache result + return       │   │
│  │ Squeezy API │ ────────▶│                             │   │
│  └─────────────┘          └─────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Caching Strategy

### Cache Key Design

```
validate:{license_key}:{activation_id}
```

### Cache Entry

```json
{
  "valid": true,
  "valid_until": "2026-02-28T00:00:00Z",
  "subscription_status": "active",
  "cached_at": "2026-01-31T10:00:00Z",
  "expires_at": "2026-01-31T11:00:00Z"
}
```

### TTL (Time-To-Live) Options

| TTL | Max Users Supported | Trade-off |
|-----|---------------------|-----------|
| 1 hour | ~3,600 | Faster detection of subscription changes |
| 6 hours | ~21,600 | Balance between freshness and capacity |
| 24 hours | ~86,400 | Maximum capacity, slower change detection |

**Recommendation**: Start with 1-hour TTL, increase as user base grows.

### Alignment with Client-Side Caching

The plan.md specifies that the client validates once per 24 hours. The backend cache TTL should be shorter than this to ensure fresh data when clients do validate:

```
Client validation interval: 24 hours
Backend cache TTL:          1 hour (recommended)

Result: Client always gets relatively fresh data from backend,
        while backend stays within API rate limits.
```

## Rate Limiting Strategy

### Per-License Rate Limit

Even with caching, implement per-license rate limiting to prevent abuse:

```
Limit: 1 validation request per license per minute
```

This prevents a malicious actor from flooding the API with requests for the same license.

### Global Rate Limit

Track total outgoing requests to LS:

```
Limit: 50 requests/minute (buffer below 60 limit)
```

If limit is reached, return cached results or queue requests.

## Retry-After Strategy (Graceful Degradation)

When LS returns 429 (Too Many Requests), the backend can instruct the client to retry later while temporarily extending the valid state.

### Flow

```
sutto extension                 sutto backend                    LS API
      │                               │                               │
      │  POST /validate               │                               │
      │ ─────────────────────────────▶│                               │
      │                               │  POST /licenses/validate      │
      │                               │ ─────────────────────────────▶│
      │                               │                               │
      │                               │  429 Too Many Requests        │
      │                               │ ◀─────────────────────────────│
      │                               │                               │
      │  { "retry_after": 180,        │                               │
      │    "temporary_valid": true }  │                               │
      │ ◀─────────────────────────────│                               │
      │                               │                               │
      │  (extend valid state,         │                               │
      │   schedule retry in 3 min)    │                               │
      │                               │                               │
```

### Backend Response (Rate Limited)

```json
{
  "status": "rate_limited",
  "retry_after": 180,
  "temporary_valid": true,
  "message": "Server busy, please retry later"
}
```

| Field | Description |
|-------|-------------|
| `retry_after` | Seconds to wait before retrying (randomized to spread load) |
| `temporary_valid` | Whether to temporarily allow usage |

### Extension Behavior

When receiving `rate_limited` response:

1. **If user has valid cached license**: Extend validity, schedule background retry
2. **If user is in trial**: Continue trial, schedule background retry
3. **If no valid state exists**: Show "temporarily unavailable" message

### Randomized Retry Delay

To prevent thundering herd when rate limit clears:

```
retry_after = base_delay + random(0, jitter)

Example:
  base_delay = 120 seconds (2 min)
  jitter = 180 seconds (3 min)
  retry_after = 120 + random(0, 180) = 120-300 seconds
```

This spreads retry attempts over a 3-minute window instead of all at once.

## Capacity Planning

### Calculation

```
Rate limit:        60 requests/minute
Safety buffer:     50 requests/minute (83%)
Requests/hour:     3,000
Cache TTL:         1 hour

Max concurrent users with 1-hour cache:
  = 3,000 users (each validates once per hour max)

With 24-hour client-side validation interval:
  = Requests spread across 24 hours
  = Effective capacity: 72,000 daily active users
```

### Growth Thresholds

| Daily Active Users | Action Required |
|--------------------|-----------------|
| < 3,000 | No special handling needed |
| 3,000 - 10,000 | Monitor cache hit rates |
| 10,000 - 50,000 | Increase cache TTL to 6 hours |
| > 50,000 | Consider LS enterprise plan or request limit increase |

## Implementation

### Cache Storage Options

| Option | Pros | Cons |
|--------|------|------|
| **In-memory** | Simple, fast | Lost on restart, no horizontal scaling |
| **Redis** | Persistent, scalable | Additional infrastructure |
| **SQLite** | Simple, persistent | Single instance only |
| **KV Store** (Cloudflare, Vercel) | Managed, scalable | Vendor-specific |

**Recommendation**: Start with in-memory for simplicity, migrate to KV store if using serverless, or Redis for container deployments.

### Pseudo-code

```typescript
async function validateLicense(licenseKey: string, activationId: string): Promise<ValidationResult> {
  const cacheKey = `validate:${licenseKey}:${activationId}`;

  // 1. Check cache
  const cached = await cache.get(cacheKey);
  if (cached && !isExpired(cached)) {
    return cached.result;
  }

  // 2. Check rate limit
  if (isRateLimited(licenseKey)) {
    if (cached) {
      return cached.result; // Return stale cache
    }
    throw new RateLimitError("Please try again later");
  }

  // 3. Call LS API
  const result = await lemonsqueezy.validate(licenseKey, activationId);

  // 4. Cache result
  await cache.set(cacheKey, {
    result,
    cached_at: Date.now(),
    expires_at: Date.now() + CACHE_TTL,
  });

  return result;
}
```

## Monitoring

Track these metrics to ensure the system is healthy:

| Metric | Alert Threshold |
|--------|-----------------|
| Cache hit rate | < 80% (indicates cache issues) |
| API requests/minute | > 50 (approaching limit) |
| 429 errors from LS | > 0 (limit exceeded) |
| Average response time | > 500ms (performance degradation) |

## References

- [LS License API](https://docs.lemonsqueezy.com/api/license-api)
- [plan.md - Validation Frequency](./plan.md#validation-frequency)
