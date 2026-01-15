# ADR: Storage Strategy for Space Visibility State

## Status

Accepted

## Context

We need to persist the enabled/disabled state of individual Spaces so that:
- Disabled Spaces remain hidden from the main panel
- The state survives extension restarts
- Users can toggle Spaces on/off from Preferences UI

**Important constraint**: Backward compatibility is not a consideration. The only user is the developer, so migration complexity and schema stability are not decision factors.

## Options

### Option A: Store in GSettings

Store an array of disabled Space identifiers in GSettings under a new `disabled-spaces` key.

**Pros:**
- Separates layout configuration from user preferences
- GSettings provides automatic persistence and change notification

**Cons:**
- Requires content-based hashing for stable Space identification
- Two sources of truth: layouts in JSON file, visibility in GSettings
- More complex implementation

### Option B: Store in JSON data file

Add an `enabled: boolean` property to the `Space` interface and persist it in the data file.

**Pros:**
- Single source of truth for all Space data
- Space `id` is already persisted in the file
- Simpler implementation

**Cons:**
- ~~Mixes layout definition with user preferences~~ (Not a concern - the file stores Space state)
- ~~Requires schema migration~~ (Not a concern - no other users)

## Decision

**Option B: Store in JSON data file**

The primary reasons for this decision:

1. **Single source of truth**: All Space data lives in one place, making it easier to understand and maintain.

2. **Simplicity**: No need for content-based hashing or GSettings integration. The Space `id` is already persisted.

3. **No backward compatibility needed**: Since the only user is the developer, migration complexity is irrelevant.

The data file will be renamed from `imported-layouts.json` to `spaces.json` to reflect its purpose as the Space data store.

## Consequences

- The `Space` interface gains an `enabled: boolean` property
- `imported-layouts.json` is renamed to `spaces.json`
- `layout-history.json` is renamed to `history.json` (separate concerns)
- `layouts.ts` is renamed to `spaces.ts`
- `layout-history.ts` is renamed to `history.ts`
