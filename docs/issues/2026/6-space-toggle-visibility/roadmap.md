# Space Feature Roadmap

## Overview

This document outlines the planned evolution of Space features. All implementation decisions in individual plans must remain compatible with this roadmap.

## Feature Timeline

### 1. Space Toggle Visibility (Current)

Allow users to enable/disable individual Spaces from Preferences UI. Disabled Spaces are hidden from the main panel but their data is preserved.

**Status**: Planning

### 2. Preset Spaces

Provide built-in Spaces that come pre-installed with Snappa. These are curated layouts for common use cases.

**Characteristics:**
- Included in the extension package
- Available immediately after installation
- Cannot be deleted (but can be disabled via toggle)
- May be updated with extension updates

### 3. Custom Spaces

Allow users to add their own Spaces by importing LayoutConfiguration as JSON files.

**Characteristics:**
- User-created or third-party layouts
- Imported via JSON file (same format as current LayoutConfiguration)
- Can be deleted by user
- Stored separately from preset spaces

## Data Model Implications

The distinction between preset and custom spaces affects how we store data:

| Aspect | Preset Spaces | Custom Spaces |
|--------|---------------|---------------|
| Source | Extension package | User import |
| Deletable | No | Yes |
| Storage | Bundled with extension | User data directory |
| Updates | Via extension update | User-managed |

## Design Decisions

### UI Organization

Preset spaces and custom spaces will be shown in **separate sections** in the Preferences UI, not merged together.

### Preset Space Updates

When preset spaces are updated via extension update, **disabled state is maintained**. If a user has disabled a preset space, it stays disabled after the update.

### Custom Space Sharing

Custom spaces do not need an export feature. Users share by distributing the original JSON file used for import.

## Compatibility Notes for Current Implementation

The Space on/off feature must:

- Work with both preset and custom spaces (future)
- Store enabled/disabled state per Space ID
- Not assume all spaces are user-deletable
- Keep the enabled state separate from the space definition source
