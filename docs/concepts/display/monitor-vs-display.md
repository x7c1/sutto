# Monitor vs Display

This document explains how to distinguish between "monitor" and "display" in the Sutto codebase.

## Monitor

**Monitor** refers to **physical display hardware devices**.

Used for:
- Physical monitor detection and management
- Monitor configuration and properties
- Multi-monitor setup tracking

Examples:
```typescript
// MonitorManager - manages physical monitors
class MonitorManager {
  detectMonitors(): Map<string, MonitorInfo>
}

// MonitorInfo - information about a physical monitor
interface MonitorInfo {
  geometry: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

// GNOME Shell API - get number of connected physical monitors
const numMonitors = global.display.get_n_monitors();
```

File/variable naming:
- `MonitorManager`
- `MonitorInfo`
- `monitor-config.json`
- `get_monitor_geometry()`
- "multi-monitor support"

## Display

**Display** has two distinct meanings depending on context:

### 1. Meta.Display (GNOME Shell API)

The display server system object provided by GNOME Shell.

```typescript
// Meta.Display - the display server system
global.display.get_current_monitor()
global.display.get_monitor_geometry(monitor)
```

### 2. Miniature Display (UI Component)

A visual representation area in the UI where layout buttons are rendered.

Used for:
- The rectangular area showing miniature window layouts
- Container for layout buttons in the panel
- Visual preview of screen space

Examples:
```typescript
// Constants for miniature display sizing
export const MINIATURE_DISPLAY_WIDTH = 204;

// Variables representing display area dimensions
function createLayoutButton(
  layout: Layout,
  displayWidth: number,   // miniature display width
  displayHeight: number,  // miniature display height
  // ...
)
```

File/variable naming:
- `MINIATURE_DISPLAY_WIDTH`
- `displayWidth`, `displayHeight` (UI component dimensions)
- "miniature display" (UI component)

## Summary

| Term | Meaning | Examples |
|------|---------|----------|
| **Monitor** | Physical hardware device | `MonitorManager`, `get_n_monitors()` |
| **Display** (1) | Display server system | `global.display`, `Meta.Display` |
| **Display** (2) | UI preview area | `MINIATURE_DISPLAY_WIDTH`, `displayHeight` |

**Rule of thumb:**
- Use **monitor** when referring to physical hardware
- Use **display** when referring to the GNOME Shell display system or UI preview areas
