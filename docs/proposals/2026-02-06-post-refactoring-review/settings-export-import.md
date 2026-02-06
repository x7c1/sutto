# Add Settings Export/Import

## Overview

Users cannot backup or share their custom layouts and settings.

## Priority

Low

## Effort

Medium

## Category

Feature

## Problem

No way to:
- Backup custom layouts before reinstall
- Share layouts with other users
- Sync settings across machines

## Proposed Actions

1. Add "Export Settings" button in Preferences
   - Export to JSON file (layouts, shortcuts, preferences)

2. Add "Import Settings" button in Preferences
   - Validate and merge imported settings

3. Consider cloud sync (future enhancement)

## Decision

- [ ] Accept
- [x] Reject
- [ ] Defer

**Notes**: Custom layouts are already JSON-based and can be copied manually. The only settings requiring manual reconfiguration are two keyboard shortcuts (stored in GSettings). Power users can use `dconf dump` for backup. Low priority until user demand emerges.
