# Add E2E/UI Testing

## Overview

No automated testing of actual user workflows. Manual testing required for each release.

## Priority

Low

## Effort

High

## Category

Quality

## Problem

Core user flows are only tested manually:
- Drag window to edge → Panel appears → Click layout → Window snaps
- Keyboard shortcut → Panel appears → Navigate → Apply layout

## Research Done

- `docs/plans/2026/9-demo-gif-generation/ui-automation-research.md` explored UI automation options
- `docs/plans/2026/9-demo-gif-generation/investigation-results.md` found that visual cursor movement in QEMU/KVM VM is not achievable (Mutter renders cursor independently from X11 pointer)
- Container-based testing (gnome-shell-pod with xvfb) may avoid the VM issue, but unverified
- Dogtail/AT-SPI can interact with named UI elements, but many St.Widget elements in the extension lack accessibility names
- Schneegans' gnome-shell-pod supports GNOME Shell 46 (Fedora 40 image), used by Burn-My-Windows and ddterm for CI

## Proposed Actions

1. Evaluate GNOME testing frameworks (dogtail, ldtp)
2. Create smoke test for core flow
3. Integrate with CI (may require VM/container with GNOME session)

## Complexity

High - requires GNOME Shell session for testing, complex CI setup.

## Decision

- [ ] Accept
- [x] Reject
- [ ] Defer

**Notes**: Rejected due to unresolved technical blockers: (1) Mouse operation emulation — Plan 9 investigation showed Mutter renders cursor independently from X11 pointer in VMs; xvfb containers may differ but unverified. (2) UI element identification — many extension UI elements (St.Widget) lack accessibility names, making Dogtail/AT-SPI targeting unreliable. No technical feasibility in sight.
