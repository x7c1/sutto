# TypeScript Build Guide

## Overview

The extension is written in TypeScript and compiled to JavaScript. The TypeScript setup provides:

- Type safety during development
- Better IDE support with autocomplete
- Compile-time error detection

## Build Modes

The extension supports two build modes:

### Development Build (`npm run build`)
- Includes D-Bus hot-reload functionality
- Use during active development
- Enables `npm run dev` for fast iteration

### Release Build (`npm run build:release`)
- Production-ready build
- Excludes development-only features
- Smaller runtime footprint
- Use for distribution

## Project Structure

```
project-root/
├── src/                          # TypeScript source files
│   ├── extension.ts              # Main extension entry
│   ├── prefs.ts                  # Preferences window entry
│   ├── composition/              # Domain composition / wiring
│   ├── domain/                   # Domain models and pure logic
│   ├── infra/                    # Infrastructure adapters (filesystem, monitors, ...)
│   ├── operations/               # Use-case orchestration
│   ├── ui/                       # St / Clutter UI components
│   └── libs/
│       └── gnome-types/          # Hand-written .d.ts for GIR / shell surfaces
│           ├── gnome-shell-50.d.ts  # Shell-50-only augmentations
│           ├── gjs-modules.d.ts     # gi:// + resource:// module declarations
│           └── *.d.ts               # GTK / Adwaita / GLib / GIO / St stubs
├── dist/                         # Build output (distribution ready)
│   ├── extension.js              # Bundled from src/extension.ts
│   ├── prefs.js                  # Bundled from src/prefs.ts
│   └── metadata.json             # Extension metadata
├── package.json                  # npm configuration
└── tsconfig.json                 # TypeScript configuration
```

**Important**: Only the `dist/` directory contents are distributed.

## Prerequisites

- Node.js and npm installed
- TypeScript and dependencies (installed via `npm install`)

## Building

### Initial Setup

```bash
npm install
```

### Build Commands

#### Development Build
```bash
npm run build
```

This command:
1. Runs the TypeScript compiler with type checking
2. Compiles `src/extension.ts` to `dist/extension.js`
3. Bundles all modules with esbuild
4. Sets `__DEV__ = true` for development features

#### Release Build
```bash
npm run build:release
```

This command:
1. Same as development build
2. Sets `__DEV__ = false` to disable development features
3. Produces a production-ready build

## Type Definitions

### Where types come from

Sutto consumes the official `@girs/*` packages for GNOME Shell, Mutter, St, Clutter, Mtk, GTK, GIO, GLib, Adwaita, etc. These provide most of the typings out of the box. The packages match the Shell-50 / Mutter-18 series (e.g., `@girs/gnome-shell@50.0.0`, `@girs/meta-18`, `@girs/st-18`).

### Custom type definitions

`src/libs/gnome-types/` contains hand-written `.d.ts` files that fill three roles:

- **`gjs-modules.d.ts`** — declares the `gi://*` and `resource://*` module paths so TypeScript can resolve imports like `import Meta from 'gi://Meta'` and `import * as Main from 'resource:///org/gnome/shell/ui/main.js'`. Each declaration re-exports the matching `@girs` namespace.
- **`gnome-shell-50.d.ts`** — augments specific Shell-50 types where the upstream `@girs` declaration is too narrow (currently a single interface-merge that narrows `Extension.metadata` from `MetadataJson` to the richer runtime `ExtensionMetadata`).
- **`adwaita.d.ts` / `gdk4.d.ts` / `gio.d.ts` / `glib.d.ts` / `gtk4.d.ts` / `st.d.ts`** — small stubs for the few cases where `@girs` types are missing or insufficient. Keep these as minimal as possible; prefer fixing or upgrading `@girs` over growing these stubs.

## TypeScript Configuration

Key settings (see `tsconfig.json` for the full configuration):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "rootDir": "./src",
    "outDir": "./.tsc",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

GNOME Shell 50 ships SpiderMonkey 128 with full ES2022 support and uses ESM throughout — no transpilation gymnastics needed.

## Troubleshooting

### Build errors after pulling

After a dependency bump or a Shell-version migration, run:

```bash
rm -rf node_modules .tsc dist
npm install
npm run build
```

If `tsc` reports missing types for a `gi://` or `resource://` module path, check that the path has a matching `declare module` block in `src/libs/gnome-types/gjs-modules.d.ts`.

### Missing Shell-50-only symbol

If `tsc` reports a missing symbol that exists on the live host but not in `@girs/gnome-shell@50`, add a minimal augmentation to `src/libs/gnome-types/gnome-shell-50.d.ts` rather than monkey-patching the upstream `.d.ts`. Keep augmentations tight — every line is a future maintenance cost.

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions Guide](https://gjs.guide/extensions/)
