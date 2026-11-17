---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
max_refine_rounds: 3
retries_remaining: 1
check_command: "npm run build && npm run check:strict && npm run test:run && ! grep -rqE '\"moduleResolution\":[[:space:]]*\"node\"' tsconfig.json src/ docs/guides/ && ! grep -rqE '@ts-ignore|@ts-expect-error|@ts-nocheck' src/ && [ \"$(grep -rE '\\bas any\\b|: any\\b' src/ | wc -l)\" -le 18 ]"
assignee: null
branch: task/1117-1116-resolve-modules-with-bundler
created_at: 2026-11-17T11:16:07Z
updated_at: 2026-11-17T11:25:37Z
---

# build(ts): resolve modules with `bundler` instead of `node`

## Overview

TypeScript 7 removes `moduleResolution: node` (node10), so `tsc --build` fails
with TS5108 on the Dependabot bump to 7.0.2 (#111). Switch every tsconfig to
`moduleResolution: bundler` **while staying on TypeScript 5.9.3**, so that the
change of resolution strategy lands separately from the change of compiler.
`bundler` has been available since TypeScript 5.0. Do not bump `typescript` in
this task.

The option is set in eight files: `tsconfig.json` and
`src/{composition,domain,infra,libs,operations,prefs,ui}/tsconfig.json`.
`docs/guides/05-typescript-build.md` quotes the option and must follow.

Switching alone produces about 56 lines of type errors, because `bundler`
honours the `exports` map of the `@girs/*` packages, which node10 ignored:

- **Deep imports that `exports` does not expose.**
  `src/libs/reloader/reloader.ts` imports
  `@girs/gnome-shell/dist/types/extension-object.js` and
  `@girs/gnome-shell/dist/ui/extensionSystem.js`;
  `src/libs/gnome-types/gnome-shell-50.d.ts` and
  `src/libs/gnome-types/gjs-modules.d.ts` import
  `@girs/gnome-shell/dist/...` paths. `@girs/gnome-shell@50.0.0` exports
  subpaths without the `dist/` segment (`./ui/extensionSystem`, `./ui/main`,
  `./ui/panelMenu`, `./ui/popupMenu`, `./misc/extensionUtils`,
  `./extensions/extension`, `./extensions/prefs`, `./extensions/global`), but
  has **no** export for `types/extension-object` or `types/extension-metadata`.
  Find where those two types are re-exported from an exposed subpath, or map
  them another way.
- **Ambient references that stop resolving.**
  `src/libs/gnome-types/gjs-modules.d.ts` uses
  `/// <reference types="@girs/st-18/st-18-ambient" />` and the like. The
  packages expose these as `./ambient` (e.g. `@girs/st-18/ambient`) and the
  module itself as `./st-18`. With the references broken, `global`,
  `Main.layoutManager`, `PanelMenu.Button`, `PopupMenu*` and `ExtensionType`
  are not found.

Candidate fixes are rewriting the specifiers to match `exports`, `paths`
mappings, or `customConditions`; none has been tried. Prefer rewriting the
specifiers, since it keeps the configuration free of indirection.

What is protected, and why:

- **Type strictness must not drop.** Do not silence errors with `any`,
  `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`, and do not loosen the
  `strict*` / `noUnused*` options. The check command pins the suppression
  comments at zero and the `any` count at its current 18.
- **The shipped bundle must not change.** `tsc` only type-checks here; esbuild
  produces `dist/*.js`. Type-only edits therefore leave the bundle identical,
  and a difference means a runtime-visible import changed.

In the work report, also state the result of running the type check once with
`typescript@6` and once with `typescript@7.0.2` against the finished tree
(e.g. `npx -p typescript@7.0.2 tsc --build --force`), without committing any
version change. This tells whether the bump in #111 will pass afterwards and
whether TypeScript 6 reports further deprecations.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] No tsconfig under the repository root or `src/`, and no guide under
      `docs/guides/`, still sets `"moduleResolution": "node"`; the build,
      strict lint and tests pass on TypeScript 5.9.3 with `bundler`.
- [x] `src/` contains no `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`.
- [x] The number of `as any` / `: any` lines under `src/` is at most 18, the
      count before this change.

### Before merge (verified outside the check command)

- [x] `npm run build:release` produces byte-identical `dist/*.js` on this
      branch and on the commit it branched from (build each in its own tree
      and compare with `sha256sum`).
- [x] `package.json` and `package-lock.json` still resolve `typescript` to
      5.9.3.
