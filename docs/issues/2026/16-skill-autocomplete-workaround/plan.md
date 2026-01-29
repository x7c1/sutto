# Skill Autocomplete Workaround

## Overview

This document describes workarounds applied to make custom skills appear in Claude Code's slash command autocomplete. These workarounds should be removed once the upstream bugs are fixed.

## Problem

Custom skills defined in `vendor/strata/skills/` do not appear in Claude Code's autocomplete menu due to two separate bugs.

## Related Issues

- https://github.com/anthropics/claude-code/issues/17271
- https://github.com/anthropics/claude-code/issues/18949

## Workarounds Applied

Both workarounds are required for skills to appear in autocomplete:

### 1. Symlinks to ~/.claude/skills/

Skills from external directories (like `vendor/strata/skills/`) must be symlinked to `~/.claude/skills/` to appear in autocomplete.

**Location:** `~/.claude/skills/`

```
strata-git-commit -> /projects/developer/vendor/strata/skills/git-commit
strata-gh-pr-create -> /projects/developer/vendor/strata/skills/gh-pr-create
strata-gh-pr-update -> /projects/developer/vendor/strata/skills/gh-pr-update
strata-gh-repo-create -> /projects/developer/vendor/strata/skills/gh-repo-create
strata-new-issue -> /projects/developer/vendor/strata/skills/new-issue
```

### 2. Remove `name` field from SKILL.md frontmatter

Skills with a `name:` field in the frontmatter do not appear in autocomplete. The directory name is used as the skill name instead.

**Before (broken):**
```yaml
---
name: git-commit
description: Format staged files and create git commit
---
```

**After (working):**
```yaml
---
description: Format staged files and create git commit
---
```

## Cleanup Instructions

When Claude Code fixes these issues:

- Remove symlinks from `~/.claude/skills/`
- Optionally restore `name:` fields if desired (directory name works fine without it)
- Monitor the GitHub issues for resolution status
