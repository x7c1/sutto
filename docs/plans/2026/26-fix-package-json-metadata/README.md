# Plan 26: Fix package.json Metadata

Status: Completed

## Overview

Fix incomplete and placeholder metadata in package.json. The package name, version, description, author, and keywords fields need to be corrected to accurately reflect the project.

## Background

The package.json was created with default/placeholder values that were never updated. Since the project is a GNOME Shell extension called "Snappa" still in early development, the metadata should reflect this.

## Changes

Update the following fields in `package.json`:

- `name`: `"developer"` → `"snappa"`
- `version`: `"1.0.0"` → `"0.0.1"` (still in development stage)
- `description`: `""` → `"Window snapping extension for GNOME Shell"`
- `author`: `""` → `"x7c1"`
- `keywords`: `[]` → `["gnome-shell-extension", "window-snapping", "tiling", "window-management"]`

## Side Effects

- `package-lock.json` will also be updated to reflect the new package name

## Verification

- Run `npm run build && npm run check && npm run test:run` to confirm no breakage

## Estimate

- 1 point
