# Extension Reloader

A reusable hot-reload utility for GNOME Shell extension development.

## Overview

This package provides two components for hot-reloading GNOME Shell extensions:

1. **`ReloadButton`** - A ready-to-use panel button (recommended for most users)
2. **`Reloader`** - The core reload logic (for custom implementations)

Both work by bypassing GJS importer caching through temporary UUID swapping.

**Inspired by:** [ExtensionReloader](https://codeberg.org/som/ExtensionReloader)

## Features

- ⚡ **Instant reload** - No GNOME Shell restart required (< 1 second)
- 🔄 **Cache bypass** - Works around GJS importer limitations
- 🧹 **Auto cleanup** - Removes old temporary instances and files
- 🌐 **Universal** - Works on both X11 and Wayland
- 📦 **Minimal code** - Add reload functionality with just 3 lines
- 🔌 **Standalone** - Easy to copy to other projects

## How It Works

1. Creates a temporary copy of the extension in `/tmp`
2. Modifies the UUID to include a timestamp (e.g., `my-ext@example.com-reload-1234567890`)
3. Loads the new copy (bypassing GJS cache)
4. Unloads the old instance
5. Cleans up old temporary files

## Usage

### Quick Start: Using ReloadButton (Recommended)

The simplest way to add reload functionality:

```typescript
import { ReloadButton } from './reloader/reload-button';

class Extension {
    private _reloadButton: ReloadButton;

    constructor(metadata: ExtensionMetadata) {
        this._reloadButton = new ReloadButton('my-extension@example.com', metadata.uuid);
    }

    enable() {
        this._reloadButton.enable();
    }

    disable() {
        this._reloadButton.disable();
    }
}
```

That's it! A reload button will appear in your panel.

### Custom Button Label

```typescript
constructor(metadata: ExtensionMetadata) {
    // Third parameter is the button label
    this._reloadButton = new ReloadButton(
        'my-extension@example.com',
        metadata.uuid,
        '🔄' // Custom label
    );
}
```

### Advanced: Using Reloader Directly

For custom implementations (e.g., keyboard shortcuts):

```typescript
import { Reloader } from './reloader/reloader';

class Extension {
    private _reloader: Reloader;

    constructor(metadata: ExtensionMetadata) {
        this._reloader = new Reloader('my-extension@example.com', metadata.uuid);
    }

    enable() {
        // Trigger reload from anywhere
        this._reloader.reload();
    }
}
```

### With a Keyboard Shortcut

```typescript
import { Reloader } from './reloader/reloader';

class Extension {
    private _reloader: Reloader;

    constructor(metadata: ExtensionMetadata) {
        this._reloader = new Reloader('my-extension@example.com', metadata.uuid);
    }

    enable() {
        // Add a keyboard shortcut (e.g., Super+R)
        Main.wm.addKeybinding(
            'reload-extension',
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => this._reloader.reload()
        );
    }

    disable() {
        Main.wm.removeKeybinding('reload-extension');
    }
}
```

## Installation

### Prerequisites

- **TypeScript** setup in your extension project
- **esbuild** (or similar bundler) to combine multiple files

### Copy Files

Copy the reloader directory from the Snappa project to your extension:

```bash
# Copy the entire reloader directory
cp -r /path/to/snappa/src/reloader ./src/
```

### Setup esbuild (if not already configured)

1. Install esbuild:
```bash
npm install --save-dev esbuild
```

2. Create `esbuild.config.js`:
```javascript
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'neutral',
    target: 'es2020',
    format: 'cjs',
    treeShaking: false,
}).then(() => console.log('✓ Build complete!'));
```

3. Update `package.json`:
```json
{
  "scripts": {
    "build": "tsc --noEmit && node esbuild.config.js"
  }
}
```

That's it! esbuild will automatically bundle `reloader.ts` and `reload-button.ts` into your extension.

## Development Workflow

With the Reloader, your development workflow becomes:

```bash
# 1. Edit your code
vim src/extension.ts

# 2. Build and copy files
npm run build && npm run copy-files

# 3. Click the Reload button (or press your keyboard shortcut)
# → Extension reloads instantly!
```

**No more:**
- ❌ Restarting GNOME Shell (Alt+F2 → r)
- ❌ Logging out and back in
- ❌ Waiting several seconds for changes to apply

## Requirements

- GNOME Shell 42+ (tested on 42)
- X11 or Wayland session
- Read/write access to `/tmp`
- Extension files in `~/.local/share/gnome-shell/extensions/`

## Limitations

- **First installation**: You still need to restart GNOME Shell once when first installing the extension
- **Metadata changes**: Changes to `metadata.json` (except UUID) may not be reflected
- **Native modules**: If your extension uses native GObject Introspection types with registered names, you may need to handle cleanup differently

## Troubleshooting

### Changes not reflected after reload

Check the logs:
```bash
journalctl -f -o cat /usr/bin/gnome-shell | grep Reloader
```

### Extension not found

Make sure your extension files are in the correct location:
```bash
ls ~/.local/share/gnome-shell/extensions/your-extension@example.com/
```

### Permission errors

Ensure `/tmp` is writable:
```bash
ls -ld /tmp
```

## Technical Details

### UUID Modification Strategy

The Reloader works by exploiting how GJS caches imports based on file paths and module identities. By changing the UUID (which is part of the extension's identity in GNOME Shell), we force a fresh import of all JavaScript modules.

### Temporary Directory Cleanup

Old reload instances are automatically cleaned up:
- When starting a new reload
- After successfully loading the new instance
- Temporary directories older than the current one are removed

### Extension Manager API

The Reloader uses these internal GNOME Shell APIs:
- `Main.extensionManager.createExtensionObject()`
- `Main.extensionManager.loadExtension()`
- `Main.extensionManager.enableExtension()`
- `Main.extensionManager.lookup()`
- `Main.extensionManager.disableExtension()`
- `Main.extensionManager.unloadExtension()`

## License

This code is part of Snappa, licensed under GPL-3.0-or-later.
You're free to copy and use it in your own GPL-compatible projects.

## Credits

- Inspired by [ExtensionReloader](https://codeberg.org/som/ExtensionReloader) by som
- Developed as part of the [Snappa](https://github.com/x7c1/snappa) project

