# Document Documentation Structure

Status: Completed

## Overview

Restructure documentation so that the root `README.md` serves as a minimal entry point with links, while detailed content lives in `docs/`. Also add a guide explaining the roles of each documentation directory.

## Background

The root `README.md` currently contains detailed setup instructions, usage guides, and development scripts inline. This makes it long and duplicates content that already exists (or should exist) in `docs/guides/`. Additionally, the different roles of `docs/` subdirectories are not explicitly documented, which can lead to misunderstanding by contributors and AI assistants.

## Changes

### Root `README.md` — rewrite as minimal entry point

Keep only:
- Project name, status badge, and short description
- Features (concise bullet list)
- Links to relevant guides for: Getting Started, Usage, Development
- Link to `docs/README.md` for full documentation
- License and external links

Remove inline content for:
- Quick Start → link to `docs/guides/02-installation.md`
- Usage → link to `docs/guides/11-usage.md`
- Development Workflow / Scripts → link to `docs/guides/03-development-workflow.md`

### `docs/guides/02-installation.md` — update

Add missing content from root README's Quick Start:
- Prerequisites section (GNOME Shell 46, Node.js, npm)
- `npm install` step

### `docs/guides/03-development-workflow.md` — update

Add missing content from root README:
- Development scripts reference (`npm run build`, `npm run lint`, `npm run format`, etc.)

### `docs/guides/11-usage.md` — new

Move the current Usage section content (Drag-to-Snap, Keyboard Shortcut) from root `README.md` into this guide.

### `docs/README.md` — new

Minimal overview of the `docs/` directory with links to guides and a brief description of each subdirectory's role.

### `docs/guides/10-documentation-structure.md` — new

Detailed guide explaining the role of each documentation directory:
- `plans/`: Planning documents for past and upcoming work (append-only, not modified after completion)
  - ADRs: Point-in-time architecture decision records
- `concepts/`: Living documentation of current concepts (updated over time)
- `guides/`: How-to guides for development
- `examples/`: Example configuration files (e.g., monitor layouts)
- `learning/`: Learning notes and reference material
- `proposals/`: Improvement proposals for review and triage

## Side Effects

- Existing links to root README sections from external sources may break (low risk for a project in early development)

## Verification

- Confirm all links in root `README.md` resolve correctly
- Confirm `docs/README.md` links work
- Review that no content is lost during the move
- Run `npm run build && npm run check && npm run test:run` to confirm no breakage

## Estimate

- 2 points
