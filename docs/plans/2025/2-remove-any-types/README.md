# Gradual Removal of `any` Types from Reloader

## Overview
Remove `any` types from `src/reloader/reloader.ts` gradually and safely to improve type safety without causing runtime errors. The file currently contains 13 instances of `any` that should be replaced with proper types.

## Background
The Reloader utility uses `any` types extensively because:
- GJS/GNOME Shell APIs lack comprehensive TypeScript type definitions
- Some types are complex and not well-documented
- Initial implementation prioritized working code over type safety

However, `any` types bypass TypeScript's type checking, which can hide bugs and make refactoring dangerous. Proper typing will:
- Catch type errors at compile time
- Improve IDE autocompletion and documentation
- Make the code more maintainable
- Serve as documentation for GNOME Shell APIs

## Requirements

### Functional Requirements
- All changes must maintain runtime behavior
- Code must pass `npm run check` (biome) after each phase
- Code must pass `npm run build` (TypeScript compilation) after each phase
- Extension must work correctly on GNOME Shell 42 after each phase

### Technical Requirements
- Create type definition files in `src/types/` for GJS APIs
- Use proper TypeScript types instead of `any`
- Use `unknown` for truly unknown types (e.g., caught errors)
- Document any remaining `any` types with comments explaining why

### Non-functional Requirements
- Changes should be incremental and testable
- Each phase should be independently verifiable
- Risk should increase gradually from safe to complex changes
- Documentation should be updated as types are added

## Current State Analysis

Total `any` occurrences: 13

### Category 1: Error Handling (4 instances)
- Line 83, 89, 104, 185: `catch (e: any)`
- **Risk Level:** Low
- **Fix:** Replace with `catch (e: unknown)` and use type guards

### Category 2: Declared Types (2 instances)
- Line 23: `TextDecoder.decode(data: any): string`
- Line 26: `TextEncoder.encode(text: string): any`
- **Risk Level:** Low
- **Fix:** Use proper types from lib.dom.d.ts or define correct signatures

### Category 3: Return Types (1 instance)
- Line 114: `_copyFilesToTemp(tmpDir: string): any`
- **Risk Level:** Medium
- **Fix:** Return `Gio.File` type after creating Gio type definitions

### Category 4: Parameters (3 instances)
- Line 97: `_cleanupOldInstances(extensionManager: any)`
- Line 143: `_updateMetadata(tmpDirFile: any, newUuid: string)`
- Line 172: `_unloadOldExtension(extensionManager: any, uuid: string)`
- **Risk Level:** Medium
- **Fix:** Create ExtensionManager interface and use Gio.File type

### Category 5: Casts (2 instances)
- Line 155: `decode(contents as any)`
- Line 161: `(newContents as any)`
- **Risk Level:** Low-Medium
- **Fix:** Use proper Uint8Array type

### Category 6: Property Access (1 instance)
- Line 52: `(Main as any).extensionManager`
- **Risk Level:** Medium
- **Fix:** Extend Main type definition with extensionManager property

## Implementation Plan

### Phase 1: Error Handling (Safest)
**Risk:** Low
**Estimated Effort:** 15 minutes
**Dependencies:** None

**Tasks:**
1. Replace all `catch (e: any)` with `catch (e: unknown)`
2. Add type guard helper function:
   ```typescript
   function getErrorMessage(e: unknown): string {
       if (e instanceof Error) return e.message;
       return String(e);
   }
   ```
3. Update error logging to use type guard
4. Test: `npm run check && npm run build`

**Lines affected:** 83, 89, 104, 185

### Phase 2: Type Definition Infrastructure
**Risk:** Low
**Estimated Effort:** 30 minutes
**Dependencies:** Phase 1 complete

**Tasks:**
1. Create `src/types/gio.d.ts`:
   - Define `Gio.File` interface with methods used in code
   - Define `Gio.FileQueryInfoFlags` enum
   - Define `Gio.FileCopyFlags` enum
   - Define `Gio.FileCreateFlags` enum
2. Create `src/types/glib.d.ts`:
   - Extend GLib type definitions if needed
3. Update `tsconfig.json` to include type definition files
4. Test: `npm run check && npm run build`

**Lines affected:** Preparation for Phase 3, 4, 5

### Phase 3: Gio.File Parameters and Return Types
**Risk:** Medium
**Estimated Effort:** 20 minutes
**Dependencies:** Phase 2 complete

**Tasks:**
1. Change `_copyFilesToTemp(tmpDir: string): any` to `_copyFilesToTemp(tmpDir: string): Gio.File`
2. Change `_updateMetadata(tmpDirFile: any, newUuid: string)` to `_updateMetadata(tmpDirFile: Gio.File, newUuid: string)`
3. Verify all usages are compatible
4. Test: `npm run check && npm run build && npm run copy-files` (manual test)

**Lines affected:** 114, 143

### Phase 4: Remove Casts with Proper Types
**Risk:** Low-Medium
**Estimated Effort:** 15 minutes
**Dependencies:** Phase 2 complete

**Tasks:**
1. Update Gio.File type definition to specify `load_contents` returns `Uint8Array`
2. Remove `contents as any` cast (line 155)
3. Update TextEncoder type to specify it returns `Uint8Array`
4. Remove `newContents as any` cast (line 161)
5. Test: `npm run check && npm run build`

**Lines affected:** 155, 161

### Phase 5: ExtensionManager Type Definition
**Risk:** Medium
**Estimated Effort:** 45 minutes
**Dependencies:** Phase 1, 2 complete

**Tasks:**
1. Research ExtensionManager API by examining GNOME Shell source code
2. Create `src/types/extension-manager.d.ts`:
   - Define ExtensionManager interface
   - Define Extension interface
   - Define ExtensionState enum
   - Define ExtensionType enum
3. Create `src/types/main.d.ts`:
   - Extend Main interface to include extensionManager property
4. Update `_cleanupOldInstances(extensionManager: any)` parameter type
5. Update `_unloadOldExtension(extensionManager: any, uuid: string)` parameter type
6. Remove `(Main as any)` cast (line 52)
7. Test: `npm run check && npm run build && npm run copy-files` (manual test)

**Lines affected:** 52, 97, 172

### Phase 6: TextEncoder/TextDecoder Types (Final)
**Risk:** Low
**Estimated Effort:** 10 minutes
**Dependencies:** Phase 1-5 complete

**Tasks:**
1. Check if @girs/gjs provides TextEncoder/TextDecoder types
2. If yes: Import and use those types
3. If no: Define proper types in `src/types/text-encoding.d.ts`
4. Remove declare statements for TextEncoder/TextDecoder
5. Test: `npm run check && npm run build`

**Lines affected:** 20-27

## Testing Strategy

### After Each Phase
1. **Static Analysis:**
   ```bash
   npm run check    # Biome linting
   npm run build    # TypeScript compilation
   ```

2. **Runtime Testing (for Phases 3, 5):**
   ```bash
   npm run copy-files
   # Click reload button in GNOME Shell
   # Verify extension reloads correctly
   # Check logs: journalctl -f -o cat /usr/bin/gnome-shell | grep Reloader
   ```

3. **Git Checkpoint:**
   ```bash
   git add src/reloader/reloader.ts src/types/
   git commit -m "refactor(reloader): phase N - <description>"
   ```

### Rollback Plan
If any phase causes issues:
1. `git revert HEAD` to undo the last commit
2. Document the issue in this plan
3. Reassess the approach for that phase

## Success Criteria

- [ ] All 13 `any` types removed or documented
- [ ] `npm run check` passes with zero errors
- [ ] `npm run build` produces working extension.js
- [ ] Extension reloads correctly on GNOME Shell 42
- [ ] Type definitions documented in `src/types/`
- [ ] No regression in functionality
- [ ] Code is more maintainable with better IDE support

## Risks and Mitigations

### Risk 1: Incorrect Type Definitions
**Impact:** High (runtime errors)
**Probability:** Medium
**Mitigation:**
- Test each phase on actual GNOME Shell environment
- Start with low-risk changes (error handling)
- Reference GNOME Shell source code for API contracts
- Keep phases small and reversible

### Risk 2: GJS API Incompatibility
**Impact:** High (extension crashes)
**Probability:** Low
**Mitigation:**
- Verify types match actual GJS behavior
- Check GNOME Shell 42 documentation
- Test thoroughly after ExtensionManager changes (Phase 5)

### Risk 3: TypeScript Compilation Issues
**Impact:** Medium (build failures)
**Probability:** Low
**Mitigation:**
- Keep existing tsconfig.json settings
- Use strict: false if needed temporarily
- Test compilation after each phase

## Timeline

**Recommended Order:** Phase 1 → 2 → 3 → 4 → 5 → 6

**Total Estimated Time:** ~2.5 hours

This can be done over multiple sessions:
- Session 1: Phases 1-2 (low risk, infrastructure)
- Session 2: Phases 3-4 (medium risk, concrete types)
- Session 3: Phases 5-6 (higher risk, complex API types)

## References

- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [GNOME Shell Source Code](https://gitlab.gnome.org/GNOME/gnome-shell)
- [GJS Documentation](https://gjs-docs.gnome.org/)
- [TypeScript: unknown vs any](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-0.html#new-unknown-top-type)

## Notes

- This is a refactoring task, not a feature addition
- Functionality must remain identical after all phases
- Type safety is the goal, but correctness is paramount
- When in doubt, prefer safer types over more specific ones
- Document any deliberate use of `any` with comments

