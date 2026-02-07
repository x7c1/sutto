# Prepare for GNOME Shell 47+

## Overview

Currently targets GNOME Shell 46 only. Future versions may require API changes.

## Priority

Medium

## Effort

Unknown

## Category

Compatibility

## Problem

- GNOME Shell 47 may introduce breaking API changes
- @girs type packages will need updates
- metadata.json currently specifies only version 46

## Proposed Actions

1. Monitor GNOME Shell 47 release notes for breaking changes
2. Plan @girs package updates when available
3. Consider supporting multiple shell versions in metadata.json

## Timeline

Dependent on GNOME Shell 47 release schedule.

## Decision

- [ ] Accept
- [x] Reject
- [ ] Defer

**Notes**: No point planning ahead - can only verify when GNOME Shell 47 is available on the developer's machine. Will address when the time comes.
