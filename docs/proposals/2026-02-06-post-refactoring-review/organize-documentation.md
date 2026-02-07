# Organize Documentation

## Overview

38+ plan documents in `docs/plans/` with varying relevance. Some overlap with `docs/concepts/`.

## Priority

Low

## Effort

Low

## Category

Documentation

## Problem

- Many completed plans still in active directory
- No index of architecture decisions (ADRs)
- Some duplication between concepts and plans

## Proposed Actions

1. Archive completed plans
   - Move to `docs/plans/archive/` or add "COMPLETED" status

2. Create ADR index
   - `docs/adr-index.md` listing all architecture decisions with links

3. Review concepts vs plans for duplicate content

4. Add status badges to plan READMEs
   - Completed, In Progress, Proposed

## Decision

- [ ] Accept
- [x] Reject
- [ ] Defer

**Notes**: Based on misunderstanding of docs structure. Plans and ADRs are historical records (expected to grow). Concepts are living documentation (updated over time). These have different roles, not duplication. Archiving or status badges are unnecessary.
