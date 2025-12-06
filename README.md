# Snappa - GNOME Shell Extension

> **⚠️ UNDER DEVELOPMENT** - This extension is currently in active development and not yet stable.

A GNOME Shell extension for window snapping.

## Features

- **Edge-triggered snapping**: Drag windows to screen edges to show the layout panel
- **Keyboard shortcut support**: Optional keyboard shortcut for quick access (disabled by default)
- **Visual layout preview**: See layout positions before applying them
- **Layout history**: Recently used layouts are highlighted for faster access
- **Customizable preferences**: Configure keyboard shortcuts through a native GNOME preferences UI

## Quick Start

### Prerequisites

- GNOME Shell 42
- Node.js and npm (for development)

### Building from Source

```bash
npm install
npm run dev
```

Then restart GNOME Shell (first time only) and enable the extension.

## Usage

### Drag-to-Snap
1. Drag any window to a screen edge
2. The layout panel appears at your cursor
3. Click a layout button to snap the window

### Keyboard Shortcut (Optional)
1. Open preferences:
   - Click the ⚙️ icon in the main panel footer, **OR**
   - Right-click the extension in GNOME Extensions app → Preferences
2. Click "Disabled" to set a keyboard shortcut
3. Press your desired key combination (e.g., `Super+Space`)
4. Press the shortcut to open the main panel for the focused window

**Note**: Keyboard shortcut is disabled by default to avoid conflicts with existing keybindings.

## Documentation

- [Development Workflow](./docs/guides/03-development-workflow.md) - Development best practices
- [TypeScript Build Guide](./docs/guides/05-typescript-build.md) - How to build the extension
- [Debugging and Logging](./docs/guides/06-debugging-and-logging.md) - Debugging techniques and logging

## Development Scripts

- `npm run build` - Development build
- `npm run build:release` - Release build (for distribution)
- `npm run dev` - Build, copy, and reload extension
- `npm run reload` - Reload extension via D-Bus
- `npm run watch` - Watch mode (auto-recompile)
- `npm run clean` - Remove compiled files
- `npm run lint` - Run Biome linter
- `npm run format` - Run Biome formatter
- `npm run check` - Run both linter and formatter

## License

This project is licensed under the GNU General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details.

## Links

- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions](https://gjs.guide/extensions/)
