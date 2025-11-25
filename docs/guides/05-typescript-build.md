# TypeScript Build Guide

This guide explains how to build the Snappa GNOME Shell extension from TypeScript source code.

## Overview

The Snappa extension is written in TypeScript and compiled to JavaScript for distribution. The TypeScript setup provides:

- Type safety during development
- Better IDE support with autocomplete
- Compile-time error detection
- Modern JavaScript features with transpilation

## Project Structure

```
project-root/
├── src/                        # TypeScript source files
│   ├── extension.ts            # Main extension code
│   └── types/                  # Custom type definitions
│       └── gnome-shell-42.d.ts # GNOME Shell 42 type definitions
├── dist/                       # Build output (distribution ready)
│   ├── extension.js            # Compiled from src/extension.ts
│   ├── extension.js.map        # Source map for debugging
│   └── metadata.json           # Extension metadata (version controlled)
├── node_modules/               # Development dependencies (not distributed)
├── package.json                # npm configuration
├── tsconfig.json               # TypeScript configuration
└── .gitignore                  # Git ignore rules
```

**Important**: Only the `dist/` directory contents are distributed. The `src/` and `node_modules/` directories are for development only.

## Prerequisites

- Node.js and npm installed
- TypeScript and dependencies (installed via `npm install`)

## Building the Extension

### Initial Setup

Install development dependencies:

```bash
npm install
```

This installs:
- TypeScript compiler
- GNOME Shell type definitions (for IDE support)
- Other development dependencies

### Compiling TypeScript

To compile TypeScript source files to JavaScript:

```bash
npm run build
```

This command:
1. Runs the TypeScript compiler (`tsc`)
2. Compiles `src/extension.ts` to `dist/extension.js`
3. Generates source maps (`dist/extension.js.map`) for debugging
4. Performs type checking to catch errors

### Watch Mode for Development

For active development, use watch mode to automatically recompile when files change:

```bash
npm run watch
```

This runs `tsc --watch` in the background. Keep this running in a terminal while developing.

### Cleaning Build Output

To remove compiled files:

```bash
npm run clean
```

This removes `dist/*.js` and `dist/*.js.map` files, but keeps `dist/metadata.json`.

## Creating Distribution Packages

The `dist/` directory contains everything needed for distribution.

### Manual ZIP Creation

If `zip` command is available:

```bash
cd dist
zip -r ../snappa@x7c1.github.io.zip .
cd ..
```

### Installing the Extension Locally

```bash
gnome-extensions install snappa@x7c1.github.io.zip --force
```

The `--force` flag overwrites any existing installation.

## Development Workflow

### Quick Workflow

1. **Make changes** to TypeScript files in `src/`
2. **Build and reload**:
   ```bash
   npm run build && npm run reload
   ```
3. **Verify** changes in GNOME Shell

The `npm run reload` command automatically copies files to the extension directory and reloads the extension.

### Watch Mode Workflow (Recommended)

1. **Start watch mode** (in one terminal):
   ```bash
   npm run watch
   ```
2. **Edit and reload** (in another terminal):
   - Edit `src/extension.ts`
   - Save the file (automatically compiles)
   - Run `npm run reload`
3. **Verify** changes in GNOME Shell

## Type Definitions

### Custom Type Definitions

The project uses custom type definitions for GNOME Shell 42 located at `src/types/gnome-shell-42.d.ts`. These definitions provide type safety for:

- `imports.gi.St` - Shell Toolkit widgets
- `imports.ui.main` - GNOME Shell main UI components
- Clutter types used for alignment and actors

### Why Custom Types?

GNOME Shell 42 uses the legacy `imports` module system, but official type definitions (`@girs` packages) only support GNOME Shell 45+ with ESM imports. The custom type definitions bridge this gap by:

1. Providing types for the `imports` API
2. Adapting GNOME Shell 45+ type definitions for compatibility
3. Including only the types actually used by the extension

## TypeScript Configuration

### tsconfig.json

Key settings for GNOME Shell 42 compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2020",      // SpiderMonkey 91 (GNOME 42) supports ES2020
    "module": "commonjs",    // GNOME 42 uses CommonJS, not ESM
    "lib": ["ES2020"],       // No DOM types
    "outDir": "./dist",      // Output directory
    "rootDir": "./src",      // Source directory
    "sourceMap": true,       // Generate source maps for debugging
    "strict": true           // Enable strict type checking
  }
}
```

## Troubleshooting

### Build Errors

**Problem**: Type errors during compilation

**Solution**: Check that:
1. `src/types/gnome-shell-42.d.ts` is present
2. Type definitions match the APIs you're using
3. `tsconfig.json` includes `src/**/*` in the `include` array

### Extension Not Loading

**Problem**: Extension doesn't appear after installation

**Solution**:
1. Check GNOME Shell version: `gnome-shell --version`
2. Verify `metadata.json` includes your GNOME Shell version in `shell-version`
3. Check for errors: `journalctl -f -o cat /usr/bin/gnome-shell`

### Missing Types

**Problem**: `any` types everywhere, no autocomplete

**Solution**:
1. Ensure your IDE supports TypeScript
2. Restart your IDE after running `npm install`
3. Check that `src/extension.ts` has `/// <reference path="./types/gnome-shell-42.d.ts" />` at the top

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions Guide](https://gjs.guide/extensions/)
- [GNOME JavaScript API Documentation](https://gjs-docs.gnome.org/)

## Next Steps

- See [Development Workflow](./03-development-workflow.md) for general development practices
- See [Build and Distribution Guide](../learning/build-and-distribution.md) for understanding GJS vs Node.js
