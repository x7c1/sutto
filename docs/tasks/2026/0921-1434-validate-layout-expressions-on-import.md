---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
retries_remaining: 1
check_command: "npm run build && npm run check && npm run test:run"
assignee: null
branch: task/0921-1434-validate-layout-expressions-on-import
created_at: 2026-09-21T05:34:59Z
updated_at: 2026-09-21T05:59:35Z
---

# fix(import): reject layout files with malformed expressions

## Overview

Importing a layout configuration only validates the top-level shape of the JSON. `isValidLayoutConfiguration` in `src/operations/layout/space-collection-operations/import-collection.ts` checks that `name` is a non-empty string and that `layoutGroups` and `rows` are arrays, and nothing deeper. `settingToLayout` in the same file then copies each layout's `x`, `y`, `width` and `height` strings into the collection as they are.

Those strings are layout expressions (`'1/3'`, `'50%'`, `'100px'`, `'50% - 10px'`). They are parsed much later, when something draws or applies the layout: `resolveRect` in `src/domain/layout-expression/rect.ts` calls `parse()`, which throws on malformed input such as `"100"` (no unit). So a file with one bad expression imports successfully and then throws every time the panel builds its miniature (`src/ui/components/layout-button.ts`), the preferences window draws its miniature (`src/prefs/gtk-miniature-display.ts`, inside a GTK draw function), or the layout is applied to a window (`src/composition/window/layout-applicator.ts`). The user sees a broken or empty preview with no hint that the imported file is the cause.

Validate the expressions at import time instead, so a malformed file is rejected up front with a log line that names the offending layout and field. Reuse `parse` from `src/domain/layout-expression/index.js` as the validator rather than writing a second grammar. Follow the existing failure path of `importLayoutConfiguration`: log and return `null`, which is what callers already handle. The nested structure (`layoutGroups[].layouts[]` with `label`, `x`, `y`, `width`, `height`) must be checked for shape as well, since the expression check has to walk it anyway and today a missing `layouts` array surfaces only as an exception caught further down.

This task assumes `resolveRect` and the shared parser entry point already exist on the default branch.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] A new test file next to `import-collection.ts` covers `importLayoutConfigurationFromJson`: a well-formed configuration is imported; a configuration whose layout has a malformed `x`, `y`, `width` or `height` returns `null` and adds nothing to the repository
- [x] The tests cover a layout group without a `layouts` array and a layout with a non-string expression field, both returning `null`
- [x] The log line for a rejected expression includes the layout's label, the field name and the offending value (asserted in a test through a stubbed `log`)
- [x] Every expression used by the built-in presets still passes the new validation (asserted in a test that runs the validator over the preset definitions in `src/domain/settings/preset-config.ts`)

### Manual / on-hardware (verified by a human before merge)

- [ ] Importing a file with a malformed expression from the preferences window leaves the existing collections untouched and does not break the miniature previews

## Out of scope

- Wrapping `resolveRect` calls in try/catch at the draw or apply sites. The point of this task is that malformed expressions never get that far
- Validating collections that are already stored on disk from earlier imports
- Changing the expression grammar or the error messages thrown by `parse()`
- Surfacing the import failure in the preferences UI beyond what the existing `null` return already triggers
