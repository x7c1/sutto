# Remove monitorKey from Layout

Status: Completed

## Overview

Refactor Layout to be a pure value object by removing monitorKey and introducing LayoutSelectedEvent for callback chains.

## Background

Currently, Layout contains monitorKey which creates conceptual redundancy:

```
Space
└── displays[monitorKey]  ← monitorKey is here
    └── LayoutGroup
        └── Layout        ← monitorKey is also here (redundant)
```

Layout should only define position and size. The monitor context should come from the Display hierarchy or be passed via events.

## Goals

- Make Layout a pure value object (position and size only)
- Introduce LayoutSelectedEvent to carry context through callback chains
- Align implementation with Concept Doc definitions

## Changes

### 1. Add LayoutPosition and LayoutSize types

These types use string expressions (e.g., "1/3", "50%", "100px", "50% - 10px"), not simple numbers.

```typescript
interface LayoutPosition {
  x: string;
  y: string;
}

interface LayoutSize {
  width: string;
  height: string;
}
```

### 2. Update Layout type

```typescript
// Before
interface Layout {
  id: string;
  hash: string;
  label: string;
  monitorKey: string;  // Remove this
  x: string;
  y: string;
  width: string;
  height: string;
}

// After
interface Layout {
  id: string;
  hash: string;
  label: string;
  position: LayoutPosition;
  size: LayoutSize;
}
```

### 3. Add LayoutSelectedEvent type

```typescript
interface LayoutSelectedEvent {
  layout: Layout;
  monitorKey: string;
}
```

### 4. Update callback signatures

```typescript
// Before
onLayoutSelected: (layout: Layout) => void

// After
onLayoutSelected: (event: LayoutSelectedEvent) => void
```

### 5. Update affected files

- `src/app/types/layout.ts` - Remove monitorKey from Layout
- `src/app/types/index.ts` - Add LayoutSelectedEvent
- `src/app/ui/layout-button.ts` - Pass event instead of layout
- `src/app/ui/miniature-display.ts` - Pass event with monitorKey from Display context
- `src/app/ui/miniature-space.ts` - Update callback type
- `src/app/main-panel/layout-selector.ts` - Update callback type
- `src/app/main-panel/keyboard-navigator.ts` - Update callback type
- `src/app/main-panel/index.ts` - Update callback chain
- `src/app/main-panel/renderer.ts` - Update callback type
- `src/app/controller.ts` - Update handler to use event
- `src/app/window/layout-applicator.ts` - Accept monitorKey as parameter
- `src/app/service/custom-import.ts` - Update layout creation (no monitorKey)

## Implementation Steps

- Add LayoutPosition and LayoutSize types
- Add LayoutSelectedEvent type
- Update Layout type to use LayoutPosition and LayoutSize
- Update LayoutApplicator.applyLayout to accept monitorKey as parameter
- Update UI components to create and pass LayoutSelectedEvent
- Update callback chain (bottom-up from UI to Controller)
- Remove monitorKey from Layout type
- Update custom-import service
- Update all code that accesses layout.x, layout.y, layout.width, layout.height
- Run tests and fix any breakages

## Out of Scope

- Concept Doc changes (Layout Concept Doc already doesn't mention monitorKey)
