# Multi-Environment Monitor Storage

Status: Completed

## Overview

Extend `monitors.sutto.json` to store multiple monitor environment configurations, enabling proper display of miniature spaces when switching collections across different monitor setups.

## Problem Statement

When switching collections in the preferences UI, miniature spaces for collections created in different monitor environments cannot be displayed properly.

**Reproduction steps:**
- Open sutto in a 2-monitor environment
- Open sutto in a 1-monitor environment
- Try to view the 2-monitor collection in preferences

**Current behavior:**
- Non-primary monitor displays are ignored and hidden
- The miniature space rendering requires monitor geometry data
- When viewing a 2-monitor collection on a 1-monitor setup, there's no geometry information for the second monitor

**Root cause:**
- `monitors.sutto.json` only stores the current monitor configuration
- No historical monitor environment data is preserved

## Scope

**No backward compatibility required** - the only user is the developer. Existing `*.sutto.json` files will be deleted and regenerated. No migration logic needed.

## Proposed Solution

### New Data Structure

Transform `monitors.sutto.json` from a flat array to a structured object with multiple environments:

**Before (current):**
```json
[
  {"index": 0, "geometry": {...}, "workArea": {...}, "isPrimary": true},
  {"index": 1, "geometry": {...}, "workArea": {...}, "isPrimary": false}
]
```

**After (proposed):**
```json
{
  "environments": [
    {
      "id": "a1b2c3d4",
      "monitors": [
        {"index": 0, "geometry": {"x": 0, "y": 0, "width": 1920, "height": 1080}, "workArea": {...}, "isPrimary": true},
        {"index": 1, "geometry": {"x": 1920, "y": 0, "width": 1920, "height": 1080}, "workArea": {...}, "isPrimary": false}
      ],
      "lastActiveCollectionId": "collection-uuid-1",
      "lastActiveAt": 1705678901234
    },
    {
      "id": "e5f6g7h8",
      "monitors": [
        {"index": 0, "geometry": {"x": 0, "y": 0, "width": 1920, "height": 1080}, "workArea": {...}, "isPrimary": true}
      ],
      "lastActiveCollectionId": "collection-uuid-2",
      "lastActiveAt": 1705678900000
    }
  ],
  "current": "a1b2c3d4"
}
```

### Environment ID Generation

The `id` is a hash computed from all monitors' geometry data:
- Input: Combined geometry values (x, y, width, height) for all monitors
- Output: Short hash string (e.g., 8 characters)

This allows distinguishing between:
- Different monitor counts (1 vs 2 monitors)
- Different resolutions (1920x1080 vs 2560x1440)
- Different arrangements (side-by-side vs stacked)

### Key Behaviors

- **New environment detection**: When a new monitor configuration is detected, compute its hash and add to `environments` array if not already present. Set `lastActiveCollectionId` to the preset collection matching the monitor count.
- **Current tracking**: `current` field always points to the active environment
- **Collection per environment**: Each environment tracks `lastActiveCollectionId` - the collection that was last used in that environment
- **Timestamp tracking**: `lastActiveAt` is updated whenever the environment becomes current or collection is changed
- **Environment switch**: When switching to a different monitor environment, automatically activate the collection that was last used in that environment
- **Collection change in settings**: When user changes collection in settings, update the current environment's `lastActiveCollectionId` and `lastActiveAt`
- **Miniature space rendering**: When displaying a collection, select the environment using the following priority:
  1. Match monitor count: prefer environments where monitor count equals the collection's display count
  2. Most recent: among matching environments, use the one with the latest `lastActiveAt`

## Implementation Plan

### Phase 1: Data Structure

- Define new TypeScript interfaces for the extended structure
- Update `MonitorManager` to work with the new structure

### Phase 2: Environment Detection and Storage

- Implement hash generation function for monitor geometries
- Add logic to detect and store new environments
- Update `saveMonitors()` to maintain environment history

### Phase 3: Miniature Space Rendering

Miniature space exists in two locations with different rendering logic:

**Settings screen (GTK-based):**
- `src/settings/gtk-miniature-space.ts`
- `src/settings/gtk-miniature-display.ts`

**Main panel (Shell-based):**
- `src/app/ui/miniature-space.ts`
- `src/app/ui/miniature-display.ts`

Both need to display collections from ANY environment. For example, when a 2-monitor collection is active in a 1-monitor environment, both locations must render 2 miniature displays using the stored monitor data from the 2-monitor environment.

Update both to look up monitor data from the environment associated with the collection being displayed.

### Handling Non-Existent Monitors

When displaying a collection from a different environment (e.g., 2-monitor collection in 1-monitor environment):

**Main panel:**
- Gray out miniature displays for monitors that don't physically exist
- Disable click interactions on grayed-out displays
- Note: Currently, clicking a layout for a non-existent monitor is safe (early return in `layout-applicator.ts:42-45`), but gray-out provides better UX

**Settings screen:**
- Do NOT gray out non-existent monitors (gray-out is already used for visibility toggle)
- Display normally using stored environment data

## Files to Modify

- `src/app/types/monitor-config.ts` - Add new interfaces
- `src/app/monitor/manager.ts` - Update detection and persistence logic
- `src/settings/monitors.ts` - Update loading logic for preferences
- `src/settings/gtk-miniature-space.ts` - Use environment data for any collection
- `src/settings/gtk-miniature-display.ts` - Receive monitor data from environment
- `src/settings/preferences.ts` - Pass environment data to components
- `src/app/ui/miniature-space.ts` - Use current environment's monitor data
- `src/app/ui/miniature-display.ts` - Receive monitor data from environment

