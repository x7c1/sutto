# Split Controller Responsibilities

Status: Completed

## Overview

`controller.ts` (~408 lines) handles multiple concerns despite the documented design principle that "Controller should NOT contain business logic." This plan extracts three handler classes — `MonitorChangeHandler`, `LicenseStateHandler`, and `DragCoordinator` — to reduce Controller to a thin event dispatcher that wires components together.

## Background

The Controller currently manages 7+ responsibilities inline:

- Window drag lifecycle (onGrabOpBegin/onGrabOpEnd/onMotion)
- Edge detection state machine during drag
- Monitor change detection and collection activation
- License state tracking and panel guards
- Panel visibility control
- Keyboard shortcut handling
- Layout history lazy loading

While low-level concerns (signal handling, timers, motion polling) are already extracted into `DragSignalHandler`, `EdgeTimerManager`, `MotionMonitor`, `KeyboardShortcutManager`, and `LayoutApplicator`, the Controller still contains mid-level coordination logic that can be further decomposed.

## Scope

### In Scope

- Extract `MonitorChangeHandler` class
- Extract `LicenseStateHandler` class
- Extract `DragCoordinator` class
- Simplify Controller to delegate to these handlers
- Maintain all existing behavior (no functional changes)

### Out of Scope

- Keyboard shortcut handler extraction (already well-managed by `KeyboardShortcutManager`)
- Panel visibility handler extraction (tightly coupled to multiple handlers)
- Adding new tests for controller (tracked separately)
- Changing the UI or operations layers

## Technical Approach

### Handler 1: MonitorChangeHandler

**File**: `src/composition/monitor/monitor-change-handler.ts`

Extracts monitor detection, environment change handling, and collection activation logic.

**Responsibilities**:
- Connect to monitor change signals via `GnomeShellMonitorProvider`
- Call `detectAndSaveMonitors()` on `MonitorEnvironmentOperations`
- Activate collection when environment changes (update preferences + operations)
- Sync active collection ID to history repository
- Re-render panel when monitors change while panel is visible

**Methods**:
- `initialize()` — detect monitors and set initial active collection
- `connectToMonitorChanges(onChanged: () => void)` — register monitor change listener
- `handleMonitorsSaveResult(collectionToActivate)` — process detection result
- `syncActiveCollectionToHistory()` — sync collection ID to history
- `disconnectMonitorChanges()` — cleanup

**State extracted from Controller**:
- Monitor change handling logic (current lines 161-173)
- `handleMonitorsSaveResult()` (lines 208-215)
- `syncActiveCollectionToHistory()` (lines 228-234)

### Handler 2: LicenseStateHandler

**File**: `src/composition/licensing/license-state-handler.ts`

Extracts license initialization, state tracking, and the license validity guard.

**Responsibilities**:
- Initialize `LicenseOperations` and track validity state
- Register state change callback to update validity
- Hide panel when license becomes invalid
- Provide `isValid()` check for other components

**Methods**:
- `initialize()` — start async license validation
- `isValid()` — return current license validity
- `onStateChange(callback)` — delegate to LicenseOperations
- `clearCallbacks()` — cleanup

**State extracted from Controller**:
- `isLicenseValid` field (line 71)
- License initialization in `enable()` (lines 147-152)
- License state change callback (lines 117-123)
- License cleanup in `disable()` (line 187)

### Handler 3: DragCoordinator

**File**: `src/composition/drag/drag-coordinator.ts`

Extracts the drag lifecycle and edge detection state machine. Coordinates the existing `MotionMonitor`, `EdgeTimerManager`, and `EdgeDetector`.

**Responsibilities**:
- Handle grab operation begin/end events
- Run edge detection state machine during motion
- Track drag state (isDragging, isAtEdge, currentWindow, lastDraggedWindow)
- Trigger panel display when edge timer fires
- Update panel position during drag

**Methods**:
- `onGrabOpBegin(window, op)` — start drag tracking
- `onGrabOpEnd(window, op)` — end drag tracking
- `getCurrentWindow()` — return current or last dragged window
- `stop()` — cleanup (stop motion monitor, clear timer, reset state)

**State extracted from Controller**:
- `currentWindow`, `lastDraggedWindow`, `isDragging`, `isAtEdge` (lines 54-57)
- `onGrabOpBegin()` (lines 247-263)
- `onGrabOpEnd()` (lines 268-281)
- `onMotion()` (lines 286-307)
- `getCursorPosition()` (lines 312-315)
- `getCurrentWindow()` (lines 320-322)
- `resetState()` (lines 199-203)

**Dependencies injected via constructor**:
- `MotionMonitor`
- `EdgeTimerManager`
- `EdgeDetector`
- `GnomeShellMonitorProvider` (for `getCurrentMonitor()`)
- Callback: `onEdgeTimerFired()` — Controller provides `showMainPanel()`
- Callback: `onPanelPositionUpdate(cursor)` — Controller provides `mainPanel.updatePosition()`
- Callback: `isPanelVisible()` — Controller provides `mainPanel.isVisible()`

### Controller After Refactoring

Controller will be reduced to approximately 200 lines with these remaining responsibilities:

- **Constructor**: Create all dependencies and wire handlers together
- **enable()**: Initialize license, monitors, drag signals, keyboard shortcuts
- **disable()**: Cleanup all handlers
- **showMainPanel()**: License guard + history loading + panel display
- **applyLayoutToCurrentWindow()**: Delegate to LayoutApplicator
- **onShowPanelShortcut()**: License guard + panel toggle via keyboard
- **onHidePanelShortcut()**: Hide panel via keyboard
- **ensureHistoryLoaded()**: Lazy load history

### Target Directory Structure

```
composition/
├── controller.ts              # Thin orchestrator (~200 lines)
├── drag/
│   ├── drag-coordinator.ts    # NEW: drag lifecycle + edge state machine
│   ├── drag-signal-handler.ts
│   ├── edge-timer-manager.ts
│   └── motion-monitor.ts
├── licensing/
│   └── license-state-handler.ts  # NEW: license state tracking
├── monitor/
│   └── monitor-change-handler.ts # NEW: monitor change coordination
├── shortcuts/
│   └── keyboard-shortcut-manager.ts
└── window/
    └── layout-applicator.ts
```

### Design Decisions

- **Callback-based communication**: Follow existing pattern (DragSignalHandler, LayoutApplicator) — handlers receive callbacks from Controller rather than holding references to Controller
- **No interface extraction**: Handlers are composition-layer internals, not cross-layer boundaries — interfaces would add complexity without benefit
- **Organize by concern**: Each handler goes into the directory matching its domain concern (drag/, monitor/, licensing/), consistent with the existing structure where drag/, shortcuts/, window/ each group related components

## Implementation Steps

- Create `src/composition/monitor/` and `src/composition/licensing/` directories
- Implement `MonitorChangeHandler` in `monitor/` with monitor detection and collection sync logic
- Implement `LicenseStateHandler` in `licensing/` with license initialization and validity tracking
- Implement `DragCoordinator` in `drag/` with drag lifecycle and edge detection state machine
- Update barrel exports (`drag/index.ts`, add `monitor/index.ts`, `licensing/index.ts`)
- Refactor `controller.ts` to delegate to the three new handlers
- Run build, type check, and tests to verify no regressions
- Manual smoke test: drag window to edge, keyboard shortcut, monitor change

## Estimated Effort

- 8 points total
  - MonitorChangeHandler: 2 points
  - LicenseStateHandler: 2 points
  - DragCoordinator: 3 points (most complex due to state machine)
  - Controller refactoring and integration: 1 point
