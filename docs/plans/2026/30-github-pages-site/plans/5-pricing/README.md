# Sub-Plan 5: Pricing Page

Status: Draft

## Overview

Create the pricing page that serves as the destination for the "Purchase License" button in the extension. This is the `LICENSE_PURCHASE_URL` target.

## Content

- 30-day free trial explanation (trial counts actual usage days, not calendar days)
- Subscription pricing and terms
- What's included (all features, up to 3 device activations)
- Link/button to external payment provider (e.g., Stripe)
- Comparison: trial vs. licensed (trial limitations, if any)

## Notes

- The actual payment flow is handled by an external service — this page links to it
- May need custom Vue components for pricing cards/CTA styling

## Verification

- Page renders correctly in local preview
- Purchase link points to the correct external payment URL

## Estimate

- 2 points
