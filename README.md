# Snappa - GNOME Shell Extension

A simple GNOME Shell extension that displays "Hello World" in the top panel.

## Overview

Snappa is a minimal GNOME Shell extension written in TypeScript, demonstrating the basics of GNOME Shell extension development with modern tooling.

## Features

- Displays a "Hello World" label in the GNOME Shell top panel
- Written in TypeScript for type safety and better development experience
- Supports GNOME Shell 42

## Quick Start

### Prerequisites

- GNOME Shell 42
- Node.js and npm (for development)

### Building from Source

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. The compiled extension is in the `dist/` directory

### Development

For active development with automatic recompilation:

```bash
npm run watch
```

See [TypeScript Build Guide](./docs/guides/05-typescript-build.md) for detailed build instructions.

## Project Structure

```
.
├── src/                    # TypeScript source code
│   ├── extension.ts        # Main extension implementation
│   └── types/              # Custom type definitions for GNOME Shell 42
├── dist/                   # Build output (distribution ready)
│   ├── extension.js        # Compiled JavaScript
│   └── metadata.json       # Extension metadata
├── docs/                   # Documentation
│   ├── guides/             # Development guides
│   └── learning/           # Learning resources
├── package.json            # npm configuration
└── tsconfig.json           # TypeScript configuration
```

## Documentation

- [TypeScript Build Guide](./docs/guides/05-typescript-build.md) - How to build the extension
- [Development Workflow](./docs/guides/03-development-workflow.md) - Development best practices

## Development Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for development (auto-recompile)
- `npm run clean` - Remove compiled files
- `npm run reload` - Copy files to extension directory and reload extension
- `npm run lint` - Run Biome linter
- `npm run format` - Run Biome formatter
- `npm run check` - Run both linter and formatter

## License

This project is licensed under the GNU General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.

## Links

- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions](https://gjs.guide/extensions/)
