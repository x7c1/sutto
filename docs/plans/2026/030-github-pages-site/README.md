# Plan 30: GitHub Pages Site

Status: Open

## Overview

Create a user-facing website for Sutto using VitePress, deployed to GitHub Pages via GitHub Actions. The site provides documentation, licensing information, and support content for end users — separate from the developer-facing docs in `docs/`.

## Background

The current documentation lives in `docs/`, which is developer-facing. General users need a separate, polished site that explains how to use Sutto, how to purchase and activate a license, and how to troubleshoot common issues. The `LICENSE_PURCHASE_URL` in the extension also needs a destination page.

## Technical Approach

- **Generator**: VitePress (see [adr.md](adr.md) for decision rationale)
- **Source directory**: `site/`
- **Deployment**: GitHub Actions workflow on push to main
- **URL**: GitHub Pages (`https://x7c1.github.io/sutto/`)

## Sub-Plans

Each page or concern is tracked as a separate sub-plan:

- [1: VitePress setup and GitHub Actions deployment](plans/1-vitepress-setup/README.md)
- [2: Landing page](plans/2-landing-page/README.md)
- [3: Usage page](plans/3-usage/README.md)
- [4: Installation page](plans/4-installation/README.md)
- [5: Pricing page](plans/5-pricing/README.md)
- [6: License activation and troubleshooting page](plans/6-license-activation/README.md)
- [7: FAQ page](plans/7-faq/README.md)
- [8: Privacy and terms page](plans/8-privacy-terms/README.md)

## Side Effects

- Adds `site/` directory with VitePress configuration and content
- Adds a GitHub Actions workflow file (`.github/workflows/`)
- Adds VitePress as a dev dependency

## Estimate

- 13 points total (see sub-plans for breakdown)
