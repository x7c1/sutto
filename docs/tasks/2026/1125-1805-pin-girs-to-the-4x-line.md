---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
max_refine_rounds: 3
retries_remaining: 1
check_command: "LICENSE_API_BASE_URL=https://api.sutto.example.com LICENSE_PURCHASE_URL=https://x7c1.github.io/sutto/pricing npm run build:release && npm run check:strict && npm run test:run && node -e 'const p=require(\"./package.json\");const bad=Object.entries(p.devDependencies).filter(([k,v])=>k.startsWith(\"@girs/\")&&!(k===\"@girs/gnome-shell\"?/^50\\./.test(v):/^4\\./.test(v)));const o=Object.keys(p.overrides||{}).filter(k=>k.startsWith(\"@girs/\"));if(bad.length||o.length){console.error(bad,o);process.exit(1)}' && ! grep -rqE '[0-9]-4\\.0\\.0-rc\\.' package-lock.json && ! grep -rqE '@girs/gnome-shell@51' docs/guides/ && ! grep -rqE '@ts-ignore|@ts-expect-error|@ts-nocheck' src/"
assignee: null
branch: task/1125-1805-pin-girs-to-the-4x-line
created_at: 2026-11-25T18:05:44Z
updated_at: 2026-11-25T18:10:52Z
---

# build(deps): move the @girs type packages to the 4.x line for GNOME Shell 50

## Overview

The extension targets GNOME Shell 50 (`shell-version` in `metadata.json`), but
its `@girs/*` type packages are a mix of three lines:

- `@girs/adw-1`, and through `overrides` `@girs/cogl-2.0`, `@girs/shell-18`,
  `@girs/gio-2.0`, `@girs/glib-2.0`, `@girs/gobject-2.0`, `@girs/cairo-1.0`,
  `@girs/gmodule-2.0`, `@girs/freetype2-2.0` and `@girs/graphene-1.0`, are
  pinned to the `4.0.0-rc.15` pre-release;
- `@girs/clutter-18`, `@girs/meta-18`, `@girs/mtk-18`, `@girs/st-18` are on
  `18.0.0-4.0.4`;
- `@girs/gjs`, `@girs/gtk-4.0` and `@girs/gdk-4.0` are on `5.6.0`, which is
  the line of the GNOME Shell 51 types (`@girs/gnome-shell@51` requires the 5.x
  packages).

The 5.x line describes GNOME Shell 51. Types that do not match the targeted
Shell let code call an API that the targeted Shell does not have and still
compile. So while `shell-version` is 50, every `@girs` package stays on the
**4.x release line** (no pre-releases), and the move to 5.x happens in the
change that adds GNOME Shell 51 support.

Change `devDependencies` to:

- `@girs/gnome-shell` `50.0.4` (the latest 50.x; it requires its `@girs`
  dependencies at `^4.1.0`);
- `@girs/adw-1`, `@girs/gdk-4.0`, `@girs/gjs`, `@girs/gtk-4.0`,
  `@girs/clutter-18`, `@girs/meta-18`, `@girs/mtk-18`, `@girs/st-18` at
  `4.9.0` (the latest 4.x of each, published together).

With every direct `@girs` package on one release line, the transitive ones
resolve to a single copy each, so drop every `@girs/*` entry from
`overrides` (keep the `vitepress` entry untouched). Regenerate
`package-lock.json` with `npm install`, and confirm with `npm ls` that each
`@girs/*` package resolves to exactly one version and that no
`4.0.0-rc.*` version is left in the lockfile.

A trial of exactly this change produced one type error:

```
src/ui/main-panel/keyboard-navigator.ts(20,7): error TS2322: Type '0' is not assignable to type 'ModifierType'.
```

`let modifiers: Clutter.ModifierType = 0;` — the 4.x types declare
`ModifierType` as an enum that the literal `0` is not assignable to. Fix it
without `any`, a cast through `unknown`, or a suppression comment; e.g. start
from a value typed as `Clutter.ModifierType` that means "no modifier" if the
typings provide one, or type the accumulator as `number` and convert where the
`ParsedShortcut.modifiers` field is set, whichever keeps the code honest. The
emitted JavaScript must not change.

Update `docs/guides/05-typescript-build.md`: it currently says the packages
match the Shell-50 series "e.g. `@girs/gnome-shell@51.0.1`", and refers to
`@girs/gnome-shell@51` in the troubleshooting paragraph. Name 50.0.4 / the
Shell-50 line instead, and state the rule in one short paragraph: the `@girs`
packages follow the Shell version the extension targets (4.x for Shell 50,
5.x for Shell 51), and move together with `shell-version`.

Do not change `.github/` (the Dependabot `ignore` for the 5.x line is a
separate change), `metadata.json`, or any runtime code beyond the type fix.

What is protected, and why:

- **The shipped bundle must not change.** `@girs` packages are type-only and
  `tsc` only type-checks; esbuild produces `dist/*.js`. A difference in the
  bundle means a runtime-visible import or expression changed, which could
  only be confirmed on a real GNOME Shell and therefore is out of scope here.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] Every `@girs/*` in `devDependencies` is on a 4.x version, except
      `@girs/gnome-shell`, which is on 50.x; `overrides` has no `@girs/*`
      entry; `package-lock.json` holds no `4.0.0-rc.*` version.
- [x] The release build, strict lint and tests pass.
- [x] `src/` contains no `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck`.
- [x] `docs/guides/` no longer names `@girs/gnome-shell@51` as the version in
      use.

### Before merge (verified outside the check command)

- [x] `npm run build:release` (with the same `LICENSE_API_BASE_URL` and
      `LICENSE_PURCHASE_URL` as the check command) produces byte-identical
      `dist/extension.js` and `dist/prefs.js` on this branch and on the commit
      it branched from (build each in its own tree with its own `npm ci`, and
      compare with `sha256sum`). If they differ, stop and report the
      difference instead of opening the PR.
- [x] `npm ls --all` shows one version per `@girs/*` package.
