# Package Version Overrides

## Problem

TypeScript compilation fails with type conflicts in `@girs/gio-2.0`:

```
Argument of type 'import(".../node_modules/@girs/gio-2.0/gio-2.0").Gio.File'
is not assignable to parameter of type
'import(".../node_modules/@girs/pangocairo-1.0/node_modules/@girs/gio-2.0/gio-2.0").Gio.File'
```

## Root Cause

The `@girs` package ecosystem has a design flaw where **different beta versions are incompatible**:

1. **Project uses**: `@girs/gjs@4.0.0-beta.12`
2. **Dependencies require**: Different beta versions (beta.15, beta.38, etc.)
3. **npm installs**: Multiple copies of the same package with different versions

```
/node_modules/@girs/gio-2.0@2.80.3-4.0.0-beta.15
/node_modules/@girs/pangocairo-1.0/node_modules/@girs/gio-2.0@2.86.0-4.0.0-beta.38
```

TypeScript treats these as **completely different types** even though they represent the same library.

## Why This Happens

`@girs` packages use **strict version pinning** in their dependencies:
- `@girs/adw-1@beta.12` requires exactly `@girs/gio-2.0@beta.12`
- `@girs/pangocairo-1.0@beta.38` requires exactly `@girs/gio-2.0@beta.38`

When a project depends on both, npm cannot satisfy both requirements, so it installs nested duplicates.

## Solution

Force all `@girs` packages to use **the same beta version** using npm's `overrides`:

```json
{
  "overrides": {
    "@girs/cally-14": "14.0.0-4.0.0-beta.12",
    "@girs/clutter-14": "14.0.0-4.0.0-beta.12",
    "@girs/meta-14": "14.0.0-4.0.0-beta.12",
    "@girs/shell-14": "14.0.0-4.0.0-beta.12",
    "@girs/gio-2.0": "2.80.3-4.0.0-beta.12",
    "@girs/gjs": "4.0.0-beta.12",
    "@girs/cairo-1.0": "1.0.0-4.0.0-beta.12",
    "@girs/glib-2.0": "2.80.3-4.0.0-beta.12",
    "@girs/gobject-2.0": "2.80.3-4.0.0-beta.12",
    "@girs/gmodule-2.0": "2.0.0-4.0.0-beta.12",
    "@girs/freetype2-2.0": "2.0.0-4.0.0-beta.12",
    "@girs/graphene-1.0": "1.0.0-4.0.0-beta.12"
  }
}
```

This ensures:
- All packages use `beta.12` (matching the project's `@girs/gnome-shell@46.0.2` requirements)
- No nested duplicates
- No type conflicts

## Result

Before:
```bash
$ npm ls @girs/gio-2.0
├── @girs/gio-2.0@2.80.3-4.0.0-beta.15 invalid
└── @girs/pangocairo-1.0
    └── @girs/gio-2.0@2.86.0-4.0.0-beta.38  # Nested duplicate!
```

After:
```bash
$ npm ls @girs/gio-2.0
└── @girs/gio-2.0@2.80.3-4.0.0-beta.12 overridden  # Single version!
```

## Impact on Code

Without overrides, we needed `as any` to bypass type checking:

```typescript
// Before: Type conflict workaround
extensionManager.createExtensionObject(newUuid, tmpDirFile as any, 1);
```

With overrides, proper types work:

```typescript
// After: No type assertion needed
extensionManager.createExtensionObject(newUuid, tmpDirFile, 1);
```

## Conclusion

The `@girs` package ecosystem's strict version pinning across beta releases causes type conflicts. The `overrides` field in package.json is necessary to maintain a consistent type system across all dependencies.

This is a **design flaw in the @girs ecosystem**, not a problem with this project.
