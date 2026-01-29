# Automated Release PR Workflow

## Overview

Automate the release process by creating a GitHub Actions workflow that automatically generates and maintains a release PR. When code is merged to main, the workflow creates a PR that bumps the version (or updates an existing release PR's description). Users control release timing by merging the PR when ready.

## Background

### Current Process
- Manually update `dist/metadata.json` version number
- Commit and push to main
- CI runs, then release workflow detects version change and creates GitHub release

### Problems
- Manual version editing is tedious and error-prone
- Easy to forget the version bump step

## Requirements

### Functional Requirements
- When code is merged to main, automatically create a release PR if none exists
- If a release PR already exists, update its description with the latest changes
- PR description should summarize all changes since the last release (latest tag)
- Version increment is simple +1 (GNOME Shell extension specification)
- Merging the release PR triggers the existing release workflow
- No filtering of changes - always create/update the release PR on any push to main
  - Developer decides when to release by choosing when to merge the PR

### Non-Functional Requirements
- Integrate with existing `release.yml` workflow (no changes needed)
- Use `release` label to identify release PRs

## Implementation Plan

### Create new workflow file

Create `.github/workflows/create-release-pr.yml`:

- **Trigger**: `push` to `main` branch
- **Skip condition**: Skip if the push is from the release PR itself (to avoid infinite loop)

### Workflow steps

- Checkout repository with full history (for tag access)
- Check for existing release PR with `release` label
- If no release PR exists:
  - Read current version from `dist/metadata.json`
  - Increment version by 1
  - Create new branch `release/v{new_version}`
  - Update `dist/metadata.json` with new version
  - Commit and push
  - Generate changelog from commits since last tag
  - Create PR with `release` label and changelog as description
- If release PR exists:
  - Generate updated changelog from commits since last tag
  - Update PR description with `gh pr edit`

### Changelog generation

Use `git log` to collect commits since the last release tag:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

### PR description format

```markdown
## Release v{version}

### Changes since v{previous_version}

- {commit message 1}
- {commit message 2}
- ...
```

## Files to Create/Modify

- Create: `.github/workflows/create-release-pr.yml`
