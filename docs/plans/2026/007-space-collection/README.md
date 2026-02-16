# SpaceCollection Feature

Status: Completed

## Overview

Introduce the SpaceCollection concept - a container that holds multiple SpacesRow instances. Users can maintain multiple SpaceCollections (e.g., "Work", "Home", "Single Monitor", "Multi Monitor") and switch between them freely. The main panel displays only one active SpaceCollection at a time.

## Background

Currently, sutto has a single set of SpacesRows that constitutes the main panel. This limits flexibility for users who work in different environments (office vs home) or with different monitor configurations.

## Requirements

### Core Concept

- **SpaceCollection**: A runtime concept holding multiple SpacesRow instances
  - `id`: Unique identifier (generated)
  - `name`: Required string for UI display (e.g., "Work", "Home", "Single Monitor")
  - `rows`: Array of SpacesRow

### Two Types of SpaceCollections

| Type | Storage | Edit | Delete |
|------|---------|------|--------|
| Preset | `preset-space-collections.sutto.json` | No | No |
| Custom | `custom-space-collections.sutto.json` | No | Yes |

### Preset SpaceCollections

- Generated dynamically when main panel or settings screen is opened
- One preset per monitor count (e.g., "Single Monitor", "Dual Monitor")
- Once generated, presets are never deleted (accumulates as user uses different monitor configurations)
- Base layout definition extracted from DEFAULT_LAYOUT_CONFIGURATION to separate file
- Generation rules based on connected monitor count:
  - 1 monitor: 2 spaces per row
  - 2+ monitors: 1 space per row
- Monitor count obtained from `monitors.sutto.json`
- Space enabled state stored within SpaceCollection (same as Custom)
- Saved to `preset-space-collections.sutto.json` after generation
- Read-only (cannot be modified or deleted by user)

### Custom SpaceCollections

- Created by importing LayoutConfiguration JSON files
- LayoutConfiguration type extended with required `name` field for import
- Parsed to generate IDs and create Layout instances
- Space enabled state stored within SpaceCollection
- Stored in `custom-space-collections.sutto.json`
- Read-only (cannot be edited in UI)
- Can be deleted by user

### Active SpaceCollection

- Only one SpaceCollection is active at a time
- Active SpaceCollection ID stored in GSettings (`active-space-collection-id`)
- Fallback: Use first preset if active ID is empty or invalid

### File Changes

| Current | New |
|---------|-----|
| `spaces.sutto.json` | `preset-space-collections.sutto.json` |
| (new) | `custom-space-collections.sutto.json` |

Note: Backward compatibility with existing `spaces.sutto.json` is not required (single developer use only). No migration needed.

## Implementation Plan

### Phase 1: Data Structure

- Define `SpaceCollection` type
- Update repository layer to handle SpaceCollection
- Rename `spaces.json` to `preset-space-collections.sutto.json`

### Phase 2: GSettings Integration

- Add `active-space-collection-id` to GSettings schema
- Implement active SpaceCollection selection logic
- Add fallback behavior for invalid/empty ID

### Phase 3: Preset Generation

- Extract DEFAULT_LAYOUT_CONFIGURATION to separate LayoutConfiguration file
- Add required `name` field to LayoutConfiguration type
- Implement dynamic preset generation based on connected monitor count
  - 1 monitor: 2 spaces per row
  - 2+ monitors: 1 space per row
- Generate preset when main panel or settings screen opens (if preset for current monitor count doesn't exist)
- Save generated preset to `preset-space-collections.sutto.json`

### Phase 4: Custom Import

- Implement LayoutConfiguration JSON import
- Parse and generate SpaceCollection from imported data
- Store in `custom-space-collections.sutto.json`
- Implement delete functionality for custom collections

### Phase 5: UI Integration

- Update main panel to use active SpaceCollection
- Renovate existing "Spaces" page to add SpaceCollection selection
- Maintain Space toggle functionality in preview pane

## Settings UI Design

Renovate existing "Spaces" page to add SpaceCollection functionality with master/detail layout:

```
┌──────────────────────┬──────────────────────────────────────────┐
│                      │                                          │
│  Preset              │                                          │
│  ────────────────    │   ┌─────────┐ ┌─────────┐                │
│  ● Single Monitor    │   │ ▢ ▢ ▢  │ │ ▢  ▢  ▢│                 │
│  ○ Dual Monitor      │   └─────────┘ └─────────┘                │
│  ○ Triple Monitor    │                                          │
│                      │   ┌─────────┐ ┌─────────┐                │
│  Custom              │   │ ▢ │ ▢  │ │▢▢▢▢    │                  │
│  ────────────────    │   └─────────┘ └─────────┘                │
│  ○ Work Setup   [x]  │                                          │
│  ○ Home Setup   [x]  │                                          │
│                      │                                          │
│  [Import...]         │                                          │
│                      │                                          │
└──────────────────────┴──────────────────────────────────────────┘
```

### Left Pane (List)

- Single scrollable list with section headers (Preset / Custom)
- Radio buttons for selecting active SpaceCollection (one selection across all)
- Delete button [x] for Custom items only
- Import button at bottom

### Right Pane (Preview)

- Full preview of selected SpaceCollection
- Shows all SpacesRows with miniature displays
- Reuses existing `createGtkMiniatureSpace` component
- **Space toggle functionality maintained**: Click a Space to toggle visibility (same as current behavior)

### Interactions

- Click list item → Show preview in right pane AND set as active SpaceCollection (saved to GSettings)
- Click Space in preview → Toggle Space visibility (enabled/disabled)
- Click [x] → Delete custom SpaceCollection
- Click [Import...] → Open file dialog to import LayoutConfiguration JSON

## Out of Scope

- SpaceCollection editing UI (too complex for now)

## Timeline

- Phase 1: 2 points
- Phase 2: 1 point
- Phase 3: 3 points
- Phase 4: 3 points
- Phase 5: 2 points
- **Total: 11 points**
