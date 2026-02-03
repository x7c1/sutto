# Window Label Pattern Matching

## Overview

Implement pattern-based window label extraction to maintain layout persistence even when window titles change dynamically (e.g., song changes in YouTube Music, page navigation in browsers).

## Current Situation

As of the three-tier window identification implementation, the system uses exact window title matching for the `byWmClassAndLabel` tier:

- **Current behavior**: `window.get_title()` is used directly as the label
- **Problem**: Titles change frequently
  - YouTube Music: Title changes with every song
  - Gmail: Title includes unread count (e.g., "Gmail (3)")
  - Browser tabs: Title changes with each page navigation
- **Result**: Loss of layout persistence when title changes

## Example Scenarios

### YouTube Music
- Window title changes: "Song A - YouTube Music" → "Song B - YouTube Music"
- Desired label: "YouTube Music" (consistent)
- Current result: Different labels → layout selection lost

### Gmail
- Window title changes: "Gmail (3)" → "Gmail (5)" → "Gmail"
- Desired label: "Gmail" (consistent)
- Current result: Different labels → layout selection lost

### Terminal
- Window title changes: "user@host:~/project" → "user@host:~/docs"
- Desired label: "user@host" or user-assigned name
- Current result: Different labels → layout selection lost

## Proposed Solution

Implement pattern-based label extraction using regular expressions:

### Pattern Configuration

Allow users (or system defaults) to define patterns per WM_CLASS:

```json
{
  "Google-chrome": {
    "patterns": [
      {
        "regex": "^(.*?) - Google Chrome$",
        "captureGroup": 1,
        "examples": ["YouTube Music", "Gmail", "Google Calendar"]
      },
      {
        "regex": "^Gmail(\\s*\\(\\d+\\))?",
        "staticLabel": "Gmail",
        "examples": ["Gmail", "Gmail (3)", "Gmail (10)"]
      }
    ]
  },
  "gnome-terminal": {
    "patterns": [
      {
        "regex": "^([^@]+@[^:]+)",
        "captureGroup": 1,
        "examples": ["user@hostname"]
      }
    ]
  }
}
```

### Label Extraction Flow

- When recording layout selection:
  1. Get `window.get_title()`
  2. Look up patterns for `window.get_wm_class()`
  3. Try each pattern in order
  4. If pattern matches:
     - Use captured group as label (if `captureGroup` specified)
     - Use static label (if `staticLabel` specified)
  5. If no pattern matches: Fall back to full title (current behavior)

- Pattern matching priority:
  - More specific patterns should be tried first
  - Static labels take precedence over captured groups
  - First match wins

### User Customization (Future Phase)

Allow users to:
- Define custom patterns per application
- Override default patterns
- Assign static labels manually (e.g., "work-terminal", "personal-gmail")

## Implementation Plan

### Phase 1: Pattern Matching Infrastructure

- Create pattern configuration data structure
- Implement pattern matching logic in `getWindowLabel()`
- Add default patterns for common applications:
  - Chrome/Chromium/Firefox browsers
  - GNOME Terminal
  - VS Code
  - Common Electron apps

### Phase 2: Configuration Storage

- Store pattern configurations in extension data directory
- Load patterns on extension enable
- Provide default patterns as fallback

### Phase 3: User Interface (Future)

- Add UI for users to:
  - View current patterns
  - Add/edit/delete patterns
  - Test patterns against current window titles
  - Assign static labels to windows

## Technical Considerations

### Pattern Storage Location

- File: `~/.local/share/gnome-shell/extensions/snappa/window-label-patterns.json`
- Format: JSON with WM_CLASS as keys
- Include default patterns in extension code

### Regex Safety

- Validate regex patterns before use
- Handle regex errors gracefully (fall back to full title)
- Set reasonable timeout for pattern matching

### Performance

- Cache compiled regex patterns
- Limit number of patterns per WM_CLASS
- Pattern matching should complete in < 1ms

### Backward Compatibility

- Existing `byWmClassAndLabel` entries remain valid
- New pattern-based labels coexist with old exact-match labels
- No migration needed (old entries gradually replaced as users reselect layouts)

## Timeline Estimate

- Phase 1 (Infrastructure): 3-5 points
- Phase 2 (Configuration): 2-3 points
- Phase 3 (UI): 5-8 points

Total: 10-16 points

## Success Criteria

- YouTube Music maintains layout selection across song changes
- Gmail maintains layout selection regardless of unread count
- Terminal windows maintain layout selection across directory changes
- Pattern matching adds < 1ms overhead
- Zero breaking changes to existing functionality
- Default patterns cover 80% of common use cases

## Future Enhancements

- Machine learning to suggest patterns based on title history
- Community-contributed pattern library
- Pattern testing/debugging tools
- Export/import pattern configurations
