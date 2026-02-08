# History Data Restructure

Status: Completed

## Overview

Redesign `history.snappa.jsonl` using an event log approach. Store layout selection events chronologically, build in-memory structures at startup. No backward compatibility required.

## Background

The current `LayoutHistory` structure has several problems:

```typescript
interface LayoutHistory {
  version: 1;
  byWindowId: { [windowId: number]: string };
  byWmClass: { [wmClass: string]: string[] };
  byWmClassAndLabel: { [key: string]: string };  // "wmClass::label"
}
```

## Problems and Solutions

### High Priority

| # | Problem | Solution |
|---|---------|----------|
| 3 | `byWmClass` array grows unboundedly | Compact when event count exceeds threshold |
| 5 | Orphaned layoutId references remain | Filter events with invalid layoutId on load |
| 7 | No metadata (lastUsed, etc.) | Each event has timestamp |
| P | Privacy: raw window titles and app names stored | Hash both wmClass and titles with SHA-256 |

### Medium Priority

| # | Problem | Solution |
|---|---------|----------|
| 1 | Data duplication between structures | Single event log, derived structures built on load |
| 2 | Window titles are unstable identifiers | Use hashed titles; hash collisions are acceptable |
| 4 | `::` delimiter may appear in keys | No string concatenation, events are flat objects |
| 6 | No monitor configuration context | Add optional monitorConfigHash field to events |

## New Data Structure

### File Format (JSONL)

Each line is a separate JSON object (newline-delimited JSON). This enables true append-only writes.

```typescript
interface LayoutEvent {
  ts: number;           // Unix timestamp (ms)
  wmClassHash: string;  // SHA-256 hash of wmClass, truncated to 16 chars
  titleHash: string;    // SHA-256 hash of window title, truncated to 16 chars
  layoutId: string;
}
```

File extension: `history.snappa.jsonl`

### In-Memory Structure (Built on Load)

```typescript
interface LayoutHistoryMemory {
  // Volatile (session-only, not persisted)
  byWindowId: Map<number, string>;            // windowId -> layoutId

  // Built from event log
  byWmClassHash: Map<string, LayoutEntry[]>;  // wmClassHash -> recent layouts (LRU, max 5)
  byTitleHash: Map<string, LayoutEntry>;      // "wmClassHash:titleHash" -> layout
}

interface LayoutEntry {
  layoutId: string;
  lastUsed: number;
}
```

**Note**: `byWindowId` is volatile because windowId is assigned by the window manager and changes every session. Persisting it would be meaningless.

## Example Data

### File (history.snappa.jsonl)

```
{"ts":1706400000000,"wmClassHash":"f1e2d3c4b5a69788","titleHash":"a1b2c3d4e5f6g7h8","layoutId":"uuid-1"}
{"ts":1706400100000,"wmClassHash":"1a2b3c4d5e6f7890","titleHash":"x9y8z7w6v5u4t3s2","layoutId":"uuid-2"}
{"ts":1706400200000,"wmClassHash":"f1e2d3c4b5a69788","titleHash":"a1b2c3d4e5f6g7h8","layoutId":"uuid-3"}
```

### In-Memory (after build)

```
byWindowId:
  (empty on startup, populated during session)

byWmClassHash:
  "f1e2d3c4b5a69788" -> [{ layoutId: "uuid-3", lastUsed: 1706400200000 }, { layoutId: "uuid-1", lastUsed: 1706400000000 }]
  "1a2b3c4d5e6f7890" -> [{ layoutId: "uuid-2", lastUsed: 1706400100000 }]

byTitleHash:
  "f1e2d3c4b5a69788:a1b2c3d4e5f6g7h8" -> { layoutId: "uuid-3", lastUsed: 1706400200000 }
  "1a2b3c4d5e6f7890:x9y8z7w6v5u4t3s2" -> { layoutId: "uuid-2", lastUsed: 1706400100000 }
```

## Privacy Design

Two separate concerns with different storage strategies:

| Feature | Data Source | Storage | Privacy |
|---------|-------------|---------|---------|
| **Automatic history** | System collects automatically | Hashed titles | Protected |
| **Pattern rules** | User defines explicitly | Plain text | User's own strings |

Pattern rules match the **current window title** against user-defined patterns. They don't access stored history data, so hashing is irrelevant.

## Write Logic

```
onLayoutSelected(windowId, wmClass, title, layoutId):
  1. Update byWindowId[windowId] = layoutId (memory only)
  2. Hash wmClass and title
  3. Append line to file: JSON.stringify({ ts, wmClassHash, titleHash, layoutId }) + "\n"
  4. Update in-memory byWmClassHash and byTitleHash
```

True append-only writes with JSONL format.

## Build Logic (on Load)

```
load():
  1. Initialize byWindowId as empty (volatile, starts fresh each session)
  2. Read lines from JSONL file, parse each as LayoutEvent
  3. Filter: remove events where layoutId no longer exists
  4. Sort by timestamp (oldest first)
  5. Process each event to build byWmClassHash and byTitleHash
  6. Trim byWmClassHash entries to max 5 per wmClassHash (LRU)
  7. Compact file if needed (see Compaction Strategy)
```

## Lookup Algorithm

```
getLayoutId(windowId, wmClass, title):
  1. Look up byWindowId[windowId]
     - If found: return layoutId (session cache hit)
  2. Check pattern rules (future feature)
     - Match current title against user-defined patterns
     - If matched: return rule's layoutId
  3. Hash wmClass and title
  4. Look up byTitleHash["wmClassHash:titleHash"]
     - If found: return layoutId
  5. Look up byWmClassHash[wmClassHash][0]
     - If found: return layoutId
  6. Return null
```

## Compaction Strategy

### Trigger Condition

Compact on load if:
- Event count exceeds 5000

### What Compaction Writes

Keep only the events that contribute to the final in-memory state:
- For each wmClassHash: events for the top 5 layoutIds (LRU)
- For each titleHash: the most recent event

This minimizes file size while preserving all useful history.

### Implementation

- Write to temp file, then rename (atomic operation)
- Runs synchronously at the end of load()

## Implementation Tasks

- [ ] Update `constants.ts`: rename `HISTORY_FILE_NAME` to `.jsonl` extension
- [ ] Define new TypeScript interfaces
- [ ] Implement SHA-256 hashing utility (for wmClass and title)
- [ ] Implement `load()` with JSONL parsing and build logic
- [ ] Implement append-only write (single line append)
- [ ] Implement `setSelectedLayout()` with byWindowId update and event append
- [ ] Implement `getSelectedLayoutId()` with new lookup order
- [ ] Implement compaction logic (rewrite file with filtered events)
- [ ] Delete old history file and test fresh

## Out of Scope

- Migration from v1 to v2 (not needed)
- Pattern rules for title matching (future feature, stored in separate `rules.snappa.json`)
- User-assignable window labels (future feature)

## Points Estimate

- 3 points

## Glossary

- **Compaction**: Process of rewriting the event log to remove filtered/obsolete events and reduce file size.
- **JSONL (JSON Lines)**: Text format where each line is a valid JSON object. Enables true append-only writes without reading the entire file.
- **LRU (Least Recently Used)**: Eviction strategy that removes the least recently accessed item when capacity is exceeded. Most recently used items stay at the front.
- **WM (Window Manager)**: Software that manages window placement, sizing, and decoration. In X11, the Window Manager is a separate process; in Wayland, it's integrated into the compositor.
- **wmClass**: Application identifier obtained via `Meta.Window.get_wm_class()`. On X11, this is the `WM_CLASS` property (class name for the Window Manager to identify apps). On Wayland, GNOME Shell returns the `app_id` from `xdg_toplevel`. Examples: `"firefox"`, `"code"`.
