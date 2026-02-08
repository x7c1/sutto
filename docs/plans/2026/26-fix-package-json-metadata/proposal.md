# Fix package.json Metadata

## Overview

Package metadata is incomplete and contains placeholder values that should be corrected.

## Priority

High

## Effort

Low

## Category

Project Setup

## Problem

Current state:

```json
{
  "name": "developer",
  "description": "",
  "author": ""
}
```

## Proposed Changes

```json
{
  "name": "sutto",
  "version": "0.0.1",
  "description": "Window snapping extension for GNOME Shell",
  "author": "x7c1"
}
```

## Decision

- [x] Accept
- [ ] Reject
- [ ] Defer

**Notes**: Also fix version from "1.0.0" to "0.0.1" - this is still in development stage.
