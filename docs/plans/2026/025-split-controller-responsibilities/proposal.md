# Split Controller Responsibilities

## Overview

`controller.ts` (~400 lines) handles multiple concerns despite the documented principle that "Controller should NOT contain business logic." Extracting handlers would improve maintainability.

## Priority

Medium

## Effort

Medium

## Category

Architecture

## Problem

Controller currently handles:

- Window drag monitoring
- Edge detection coordination
- Monitor change handling
- License state management
- Panel visibility control
- Keyboard shortcut coordination
- History loading

## Proposed Actions

1. Extract `MonitorChangeHandler` class
   - Handle monitor detection and environment changes
   - Manage collection activation on environment change

2. Extract `LicenseStateHandler` class
   - Initialize and track license state
   - Handle license validation callbacks

3. Keep Controller as pure event dispatcher

## Target Structure

```
composition/
├── controller.ts           # Event dispatch only
├── handlers/
│   ├── monitor-change-handler.ts
│   └── license-state-handler.ts
├── drag/
├── shortcuts/
└── window/
```

## Decision

- [x] Accept
- [ ] Reject
- [ ] Defer

**Notes**:
