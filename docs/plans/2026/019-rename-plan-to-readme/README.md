# Rename plan.md to README.md

Status: Completed

## Overview

Change the planning document filename from `plan.md` to `README.md` across both strata and sutto repositories. This allows GitHub to automatically render the document when viewing a plan directory.

## Motivation

- Currently, opening a plan directory requires an extra click to view `plan.md`
- `README.md` is automatically rendered by GitHub when viewing a directory
- This improves the browsing experience for plan documents

## Scope

### strata (submodule)

- Rename directory: `docs/issues` → `docs/plans`
- Rename files: 2x `plan.md` → `README.md`
- Update references: 20 locations in skills and hooks

#### Files to modify

**Hooks:**
- `hooks/on-git-branch.sh` - Comment reference

**Skills:**
- `skills/new-plan/SKILL.md` - 4 references
- `skills/get-plan/SKILL.md` - 8 references
- `skills/get-plan/get-plan.sh` - 2 references (including path generation logic)
- `skills/implement-plan/SKILL.md` - 5 references

**Documentation:**
- `CLAUDE.md` - Section header

### sutto (parent repository)

- Rename files: 36x `plan.md` → `README.md`

## Implementation

- Use `git mv` to preserve history
- Update all references atomically
- Run tests after changes

## Checklist

- [ ] strata: Rename `docs/issues` to `docs/plans`
- [ ] strata: Rename `plan.md` to `README.md` in docs
- [ ] strata: Update skills and hooks
- [ ] strata: Update CLAUDE.md
- [ ] strata: Run tests
- [ ] sutto: Rename all 36 `plan.md` files to `README.md`
