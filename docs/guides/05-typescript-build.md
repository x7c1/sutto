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
├── src/                        # TypeScript source files
│   ├── extension.ts            # Main extension code
│   └── types/                  # Custom type definitions
│       └── gnome-shell-42.d.ts # GNOME Shell 42 type definitions
├── dist/                       # Build output (distribution ready)
│   ├── extension.js            # Compiled from src/extension.ts
│   └── metadata.json           # Extension metadata
├── package.json                # npm configuration
└── tsconfig.json               # TypeScript configuration
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

### Custom Type Definitions

The project uses custom type definitions for GNOME Shell 42 at `src/types/gnome-shell-42.d.ts`.

### Why Custom Types?

GNOME Shell 42 uses the legacy `imports` module system, but official type definitions (`@girs` packages) only support GNOME Shell 45+ with ESM imports. The custom type definitions bridge this gap.

## TypeScript Configuration

Key settings for GNOME Shell 42 compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2020",      // SpiderMonkey 91 (GNOME 42) supports ES2020
    "module": "commonjs",    // GNOME 42 uses CommonJS, not ESM
    "lib": ["ES2020"],       // No DOM types
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

## Troubleshooting

### Build Errors

Check that:
1. `src/types/gnome-shell-42.d.ts` is present
2. Type definitions match the APIs you're using

### Missing Types

Ensure `src/extension.ts` has this at the top:
```typescript
/// <reference path="./types/gnome-shell-42.d.ts" />
```

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions Guide](https://gjs.guide/extensions/)
