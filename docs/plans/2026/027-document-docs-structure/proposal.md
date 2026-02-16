# Document Documentation Structure

## Overview

Add a guide explaining the roles of each documentation directory to prevent misunderstanding by contributors and AI assistants.

## Priority

Low

## Effort

Low

## Category

Documentation

## Problem

The different roles of `docs/plans/`, `docs/concepts/`, and ADRs are not explicitly documented. This can lead to misunderstanding (e.g., thinking historical records need archiving).

## Proposed Actions

1. Create `docs/guides/10-documentation-structure.md` explaining:
   - `plans/`: Historical records of past planning (append-only)
   - `concepts/`: Living documentation of current concepts (updated over time)
   - `guides/`: How-to guides for development
   - ADRs: Point-in-time architecture decision records

2. Add a link to this guide from `docs/README.md` (keep README minimal)

## Decision

- [x] Accept
- [ ] Reject
- [ ] Defer

**Notes**: Emerged from discussion of proposal #8. Low effort, prevents future confusion.
