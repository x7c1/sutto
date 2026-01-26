# Preset Wide/Standard Split

## Overview

Split preset SpaceCollections into two categories based on monitor aspect ratio: wide (ultrawide monitors) and standard. This provides optimized default layouts for different monitor types while ensuring at least two presets always exist (avoiding GTK4 single radio button rendering issue).

## Background

Currently, presets are generated based on monitor count only (e.g., "1 Monitor", "2 Monitors"). The existing layout configurations were designed for ultrawide monitors (5120x2160). Standard monitors (16:9) would benefit from different layout configurations optimized for their aspect ratio.

## Requirements

### Wide Monitor Definition
- Aspect ratio >= 21:9 (approximately 2.33:1)
- Examples: 2560x1080, 3440x1440, 5120x2160

### Preset Naming Convention
- Wide: "1 Wide Monitor" / "2 Wide Monitors" etc.
- Standard: "1 Monitor" / "2 Monitors" etc.

### Preset Generation Rules
- Generate presets for both wide and standard variants for each monitor count
- At minimum, always have:
  - "1 Monitor" (standard)
  - "1 Wide Monitor" (wide)

### Layout Differences
- **Wide monitors** (existing): Current layout groups (vertical 2-split, vertical 3-split, vertical 3-split wide center, grid 4x2, full screen)
- **Standard monitors** (new): Simpler splits optimized for 16:9 (vertical 2-split, horizontal 2-split, vertical 3-split, full screen)

## Implementation Plan

### Phase 1: Layout Group Configuration

**File: `src/app/config/base-layout-groups.ts`**

Add standard monitor layout groups alongside existing wide monitor groups:

```typescript
// Add new layout group for standard monitors
{
  name: 'horizontal 2-split',
  layouts: [
    { label: 'Top Half', x: '0', y: '0', width: '100%', height: '50%' },
    { label: 'Bottom Half', x: '0', y: '50%', width: '100%', height: '50%' },
  ],
},
```

Define which layout groups are used for each monitor type:

```typescript
export const WIDE_LAYOUT_GROUP_NAMES = [
  'vertical 3-split',
  'vertical 3-split wide center',
  'vertical 2-split',
  'grid 4x2',
  'full screen',
];

export const STANDARD_LAYOUT_GROUP_NAMES = [
  'vertical 2-split',
  'horizontal 2-split',
  'vertical 3-split',
  'full screen',
];
```

### Phase 2: Preset Generator Update

**File: `src/app/service/preset-generator.ts`**

#### 2.1 Add monitor type enum and naming functions

```typescript
type MonitorType = 'wide' | 'standard';

function getPresetName(monitorCount: number, monitorType: MonitorType): string {
  const suffix = monitorCount === 1 ? 'Monitor' : 'Monitors';
  const typeLabel = monitorType === 'wide' ? ' Wide' : '';
  return `${monitorCount}${typeLabel} ${suffix}`;
}
// Examples: "1 Monitor", "1 Wide Monitor", "2 Monitors", "2 Wide Monitors"
```

#### 2.2 Update `generateRows()` to accept monitor type

```typescript
function generateRows(monitorCount: number, monitorType: MonitorType): SpacesRow[] {
  const layoutGroupNames = monitorType === 'wide'
    ? WIDE_LAYOUT_GROUP_NAMES
    : STANDARD_LAYOUT_GROUP_NAMES;
  // ... rest of implementation
}
```

#### 2.3 Update `generatePreset()` to accept monitor type

```typescript
function generatePreset(monitorCount: number, monitorType: MonitorType): SpaceCollection {
  return {
    id: generateUUID(),
    name: getPresetName(monitorCount, monitorType),
    rows: generateRows(monitorCount, monitorType),
  };
}
```

#### 2.4 Update `ensurePresetForMonitorCount()` to generate both types

```typescript
export function ensurePresetForMonitorCount(monitorCount: number): void {
  if (monitorCount <= 0) {
    log('[PresetGenerator] Invalid monitor count, skipping preset generation');
    return;
  }

  const presets = loadPresetCollections();
  const monitorTypes: MonitorType[] = ['standard', 'wide'];
  let updated = false;

  for (const monitorType of monitorTypes) {
    const presetName = getPresetName(monitorCount, monitorType);
    const existing = presets.find((p) => p.name === presetName);

    if (!existing) {
      log(`[PresetGenerator] Generating preset "${presetName}"`);
      const newPreset = generatePreset(monitorCount, monitorType);
      presets.push(newPreset);
      updated = true;
    }
  }

  if (updated) {
    savePresetCollections(presets);
  }
}
```

#### 2.5 Update `ensurePresetForCurrentMonitors()` return type

The function now generates two presets but doesn't need to return them:

```typescript
export function ensurePresetForCurrentMonitors(): void {
  const monitorCount = loadMonitorCount();
  if (monitorCount === 0) {
    log('[PresetGenerator] No monitor info available, skipping preset generation');
    return;
  }
  ensurePresetForMonitorCount(monitorCount);
}
```

#### 2.6 Update `hasPresetForMonitorCount()` (if still needed)

```typescript
export function hasPresetForMonitorCount(monitorCount: number, monitorType: MonitorType): boolean {
  const presets = loadPresetCollections();
  const presetName = getPresetName(monitorCount, monitorType);
  return presets.some((p) => p.name === presetName);
}
```

### Phase 3: Caller Updates

Update callers that use the return value of `ensurePresetForCurrentMonitors()`:

**Files to check:**
- `src/app/main-panel/index.ts`
- `src/settings/preferences.ts`
- `src/settings/spaces-page.ts`

These files call `ensurePresetForCurrentMonitors()` but may not use the return value. Verify and update if necessary.

## Out of Scope

- Automatic detection of current monitor type for preset selection
- Custom aspect ratio thresholds in settings

## Timeline

- Phase 1: 1 point
- Phase 2: 3 points
- Phase 3: 1 point
- **Total: 5 points**

## Notes

This change ensures at least two presets always exist, which avoids a GTK4 rendering issue where a single radio button appears as a checkbox (see `adr.md` for details).

