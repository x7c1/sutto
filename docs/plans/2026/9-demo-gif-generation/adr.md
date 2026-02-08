# ADR: Demo GIF Generation Approach

## Overview

Architecture Decision Record for choosing the automation approach for generating sutto demo GIFs.

## Context

We need to automatically generate GIF animations demonstrating sutto usage. The solution must:

- Run without manual GUI interaction
- Support arbitrary display resolutions and multi-monitor setups
- Work on both X11 and Wayland
- Show visible cursor movement in recordings

## Options Considered

### Option A: openQA

openQA is an automated test tool used by GNOME, Fedora, and openSUSE for OS-level testing.

**Pros:**
- Battle-tested by major Linux distributions
- Built-in video recording
- Needle-based UI detection (fuzzy image matching)
- No coordinate hardcoding needed
- Handles UI changes gracefully

**Cons:**
- Requires complex infrastructure (web server, PostgreSQL, workers, scheduler)
- Designed for large-scale CI/continuous testing
- Significant learning curve
- Overkill for generating a few demo GIFs

### Option B: Packer + Dogtail + GNOME Screencast

Lightweight approach using individual tools:

- **Packer**: Reproducible VM image creation
- **Dogtail**: Find UI elements by name via AT-SPI
- **xdotool**: Visible cursor movement and clicks
- **GNOME Screencast**: Recording via D-Bus API

**Pros:**
- Simple architecture, no server infrastructure
- Each component has a single responsibility
- Easy to understand and debug
- Appropriate scale for the use case
- Can borrow concepts from openQA (needle-like approach) without the complexity

**Cons:**
- Must implement smooth cursor movement manually
- Less robust to UI changes than openQA's fuzzy matching
- No built-in test management UI

## Decision

**Chosen: Option B (Packer + Dogtail + GNOME Screencast)**

## Rationale

openQA is designed for large-scale OS testing with complex infrastructure requirements. For generating demo GIFs for a single GNOME extension, this is overkill.

The lightweight approach provides:

- Faster setup time
- Easier maintenance
- Sufficient functionality for the use case
- Local execution without server dependencies

The needle concept from openQA (screenshot-based UI detection) can be adopted conceptually if needed, but the full openQA infrastructure is not justified for this scale.

## References

- [openQA Documentation](https://open.qa/docs/)
- [Introducing openqa.gnome.org](https://discourse.gnome.org/t/introducing-openqa-gnome-org/7270)
- [dogtail - PyPI](https://pypi.org/project/dogtail/)
