# Update D-Bus Reloader to GNOME Shell 46 API

## Overview

Update the D-Bus reloader development tool to use proper GNOME Shell 46 ExtensionManager API instead of type-unsafe `as any` workarounds.

**Key Points:**
- Replace `(Main as any).extensionManager` with typed `Main.extensionManager`
- Convert to async/await for `loadExtension()` and `unloadExtension()` (now Promise-based)
- Handle `createExtensionObject()` API change (now returns `void`, use `lookup()` to retrieve)
- Add error handling for `enableExtension()`/`disableExtension()` boolean returns
- Document why `reloadExtension()` method cannot be used (requires same UUID)
- Handle `lookup()` type signature bug (returns `undefined` despite non-nullable type)
- Use public `getUuids()` API instead of private `_extensions` property

## Background

### Current State

The D-Bus reloader (`src/reloader/reloader.ts`) currently uses:
```typescript
const extensionManager = (Main as any).extensionManager;
```

This bypasses TypeScript's type system and doesn't leverage the proper type definitions available in `@girs/gnome-shell@46.0.2`.

### Why This Exists

- During GNOME Shell 42 → 46 migration, the reloader was kept working using `as any`
- Shell 46 introduced breaking API changes to ExtensionManager
- Proper type definitions are now available in `@girs/gnome-shell/dist/ui/extensionSystem.d.ts`
- Old type definition file `src/types/extension-manager.d.ts` (Shell 42 era) has been removed

## Problem Statement

**Type Safety Issue:**
- Using `as any` defeats TypeScript's type checking
- No compile-time verification of ExtensionManager API usage
- Risk of runtime errors if API changes in future GNOME Shell versions

**Maintenance Burden:**
- Code doesn't reflect actual Shell 46 API
- Unclear what methods are available and their signatures
- No IDE autocomplete or type hints

## API Changes (Shell 42 → Shell 46)

Based on `@girs/gnome-shell/dist/ui/extensionSystem.d.ts`:

| Method | Shell 42 | Shell 46 |
|--------|----------|----------|
| `createExtensionObject()` | Returns `Extension` | `(uuid: string, dir: Gio.File, type: ExtensionType): void` |
| `loadExtension()` | Synchronous `boolean` | `(extension: ExtensionObject): Promise<void>` |
| `unloadExtension()` | Synchronous `boolean` | `(extension: ExtensionObject): Promise<boolean>` |
| `reloadExtension()` | N/A | `(oldExtension: ExtensionObject): Promise<void>` |
| `enableExtension()` | Synchronous `boolean` | `(uuid: string): boolean` |
| `disableExtension()` | Synchronous `boolean` | `(uuid: string): boolean` |
| `lookup()` | Returns `Extension \| null` | `(uuid: string): ExtensionObject` |
| `getUuids()` | N/A | `(): readonly string[]` |

**Key Changes:**
- Extension creation now mutates internal state instead of returning object
- Loading/unloading became asynchronous (Promise-based)
- `Extension` type renamed to `ExtensionObject`
- `lookup()` type signature doesn't include `null`, but **runtime actually returns `undefined`** when UUID not found (verified in current implementation)
- `getUuids()` method is available for iterating all extensions (confirmed in type definitions)
- `reloadExtension()` added but **not usable for our use case** (see below)
- `enableExtension()` and `disableExtension()` remain synchronous with `boolean` return values

### About reloadExtension()

Shell 46 added `reloadExtension(oldExtension)` which:
1. Unloads the old extension
2. Creates a new extension object with **the same UUID**
3. Loads the new extension

**Why we can't use it:**
Our Reloader creates extensions with **new UUIDs** (`original-uuid-reload-timestamp`) to avoid D-Bus interface name conflicts. The `reloadExtension()` method reuses the same UUID, which would cause D-Bus registration conflicts if the old extension hasn't fully unregistered yet.

**Our approach:**
- Generate new UUID for each reload
- Disable old extension first
- Wait 100ms for cleanup
- Create and load new extension with different UUID
- Clean up old extension after new one is running

## Implementation Plan

### Step 1: Update Type Imports

Add proper imports from `@girs/gnome-shell`:

```typescript
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
// Main.extensionManager is now properly typed
```

### Step 2: Handle createExtensionObject API Change

**Before (Shell 42 pattern):**
```typescript
const newExtension = extensionManager.createExtensionObject(
  newUuid,
  tmpDirFile,
  1 // ExtensionType.PER_USER
);
extensionManager.loadExtension(newExtension);
```

**After (Shell 46 pattern):**
```typescript
// createExtensionObject returns void, mutates internal state
extensionManager.createExtensionObject(
  newUuid,
  tmpDirFile,
  1 // ExtensionType.PER_USER
);

// Retrieve the created extension using lookup
const newExtension = extensionManager.lookup(newUuid);
if (!newExtension) {
  throw new Error(`Failed to create extension object for ${newUuid}`);
}

await extensionManager.loadExtension(newExtension);
```

### Step 3: Update disable/enable Method Calls

**Current code:**
```typescript
extensionManager.disableExtension(this.currentUuid);
// ... later ...
extensionManager.enableExtension(newUuid);
```

**Updated with error handling:**
```typescript
const disableSuccess = extensionManager.disableExtension(this.currentUuid);
if (!disableSuccess) {
  console.warn(`[Reloader] Failed to disable extension ${this.currentUuid}`);
}

// ... later ...
const enableSuccess = extensionManager.enableExtension(newUuid);
if (!enableSuccess) {
  throw new Error(`Failed to enable extension ${newUuid}`);
}
```

**Note:** Both methods remain synchronous in Shell 46, returning `boolean` for success/failure.

### Step 4: Understand the Reload Sequence

**Critical timing requirements:**

```typescript
async reload(): Promise<void> {
  // 1. Disable old extension (synchronous, but D-Bus cleanup is async)
  extensionManager.disableExtension(this.currentUuid);

  // 2. Wait for D-Bus interface to fully unregister
  //    This is why we need the 100ms delay - D-Bus cleanup happens asynchronously
  await this.waitAsync(100);

  // 3. Create new extension object with new UUID
  extensionManager.createExtensionObject(newUuid, tmpDirFile, 1);

  // 4. Retrieve the created extension
  const newExtension = extensionManager.lookup(newUuid);

  // 5. Load and enable new extension
  await extensionManager.loadExtension(newExtension);
  extensionManager.enableExtension(newUuid);
}
```

**Why this sequence:**
- **New UUID** avoids D-Bus name conflicts during transition
- **Disable first** ensures old D-Bus interface starts cleanup
- **100ms wait** allows async D-Bus unregistration to complete
- **Load before enable** initializes extension state
- **Enable last** activates the extension

### Step 5: Convert to Async/Await

**Current code structure:**
```typescript
reload(): void {
  // ... disable old extension
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    // ... load new extension
    return GLib.SOURCE_REMOVE;
  });
}
```

**Updated structure:**
```typescript
async reload(): Promise<void> {
  // ... disable old extension

  // Wait asynchronously instead of using GLib.timeout_add
  await this.waitAsync(100);

  // Use await for loading/unloading
  await extensionManager.loadExtension(newExtension);
}

private waitAsync(ms: number): Promise<void> {
  return new Promise((resolve) => {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      resolve();
      return GLib.SOURCE_REMOVE;
    });
  });
}
```

### Step 6: Update Method Signatures

Update all private methods to use proper types from `@girs/gnome-shell`:

**Before:**
```typescript
private cleanupOldInstances(extensionManager: any): void
private unloadOldExtension(extensionManager: any, uuid: string): void
```

**After:**
```typescript
import { ExtensionManager } from 'resource:///org/gnome/shell/ui/extensionSystem.js';

private cleanupOldInstances(extensionManager: ExtensionManager): void
private async unloadOldExtension(extensionManager: ExtensionManager, uuid: string): Promise<void>
```

**Note:** `Main.extensionManager` is declared as `ExtensionManager` type in the type definitions.

### Step 7: Handle _extensions Internal Property

The `_extensions` property is private/internal. Options:

**Option A: Keep type assertion for internal access**
```typescript
const allExtensions = (extensionManager as any)._extensions;
```

**Option B: Use public API (preferred, confirmed available)**
```typescript
const uuids = extensionManager.getUuids();
for (const uuid of uuids) {
  const extension = extensionManager.lookup(uuid);
  // ...
}
```

**Recommendation:** Use Option B. The `getUuids()` method is confirmed to exist in Shell 46 type definitions (`extensionSystem.d.ts:76`).

### Step 8: Handle Async Method Return Values and lookup() Behavior

**unloadExtension return value:**
```typescript
const success = await extensionManager.unloadExtension(oldExtension);
if (!success) {
  console.warn(`Failed to unload extension ${uuid}`);
}
```

**lookup() runtime behavior:**
The type signature shows `lookup(uuid: string): ExtensionObject` (non-nullable), but **runtime actually returns `undefined`** when UUID doesn't exist (verified in current implementation at `reloader.ts:227-229`). Always add defensive checks:

```typescript
const extension = extensionManager.lookup(uuid);
if (!extension) {
  throw new Error(`Extension ${uuid} not found`);
}
```

**TypeScript handling:**
Since the type definition is incorrect, you may need to use a type assertion or add `| undefined` to handle this properly:

```typescript
const extension = extensionManager.lookup(uuid) as ExtensionObject | undefined;
```

## Files to Modify

- `src/reloader/reloader.ts` - Main reloader implementation

## Testing Plan

- Build verification: `npm run build` must pass without errors
- Runtime testing:
  - Enable extension
  - Run `npm run reload`
  - Verify extension reloads successfully
  - Check console logs for errors
  - Verify D-Bus interface re-registers correctly

## Success Criteria

- No `as any` type assertions for ExtensionManager API (except for truly private properties if unavoidable)
- All ExtensionManager method calls use proper types from `@girs/gnome-shell`
- TypeScript compilation succeeds
- Extension reload functionality works correctly
- Console logs show successful reload sequence
- Runtime verification that `lookup()` behavior with non-existent UUIDs is handled correctly

## Risks and Mitigations

**Risk 1: Async behavior changes**
- **Impact:** Timing-sensitive reload sequence might break
- **Mitigation:** Test thoroughly, add appropriate delays if needed

**Risk 2: Internal API access**
- **Impact:** `_extensions` might not have public alternative
- **Mitigation:** Use `getUuids()` public API (confirmed available in type definitions)

**Risk 3: lookup() type signature discrepancy**
- **Impact:** Type definition shows non-nullable return, but **runtime returns `undefined`** for non-existent UUIDs (confirmed)
- **Mitigation:** Always add defensive checks and use type assertion `as ExtensionObject | undefined` where needed

**Risk 4: Breaking reload functionality**
- **Impact:** Development workflow becomes slower
- **Mitigation:** Keep git backup before changes, test incrementally

## Future Improvements

After this update:
- Consider extracting reloader logic to separate package
- Add unit tests for reloader (currently untested)
- Document reload mechanism for contributors

## References

- GNOME Shell 46 ExtensionManager API: `node_modules/@girs/gnome-shell/dist/ui/extensionSystem.d.ts`
- Main module types: `node_modules/@girs/gnome-shell/dist/ui/main.d.ts`
- Current implementation: `src/reloader/reloader.ts`
