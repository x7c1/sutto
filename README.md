# Snappa - GNOME Shell Extension

> **⚠️ UNDER DEVELOPMENT** - This extension is currently in active development and not yet stable.

A GNOME Shell extension for window snapping.

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

## Documentation

- [Debugging and Logging](./docs/guides/06-debugging-and-logging.md) - Debugging techniques and logging
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
