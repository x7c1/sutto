# Installing GNOME Shell Extensions

## Extension Directory Location

GNOME Shell extensions are installed in:
```
~/.local/share/gnome-shell/extensions/<extension-uuid>/
```

## Installation Steps

### 1. Build the Extension

First, compile TypeScript to JavaScript:

```bash
npm run build
```

This creates the compiled files in the `dist/` directory.

### 2. Copy Files to Extension Directory

```bash
npm run copy-files
```

This script automatically:
- Creates the extension directory (`~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/`)
- Copies all files from `dist/` to the extension directory

**Note:** The directory name must match the UUID in `metadata.json`.

### 3. Restart GNOME Shell (First Time Only)

#### For X11 Session:
```bash
killall -3 gnome-shell
```

#### For Wayland Session:
- Logout and login again
- Or reboot

### 4. Enable the Extension

```bash
gnome-extensions enable snappa@x7c1.github.io
```

### 5. Verify Installation

```bash
gnome-extensions list
gnome-extensions info snappa@x7c1.github.io
```

You should see a "Reload" button in the GNOME Shell top panel.

## Quick Installation (Summary)

For experienced users, here's the complete installation in a few commands:

```bash
# Build and install
npm run build && npm run copy-files

# Restart GNOME Shell (X11 only, first time)
killall -3 gnome-shell

# Enable extension
gnome-extensions enable snappa@x7c1.github.io
```

## After Installation: Self-Reload Feature

Once installed, snappa includes a **self-reload feature**. You can reload the extension by clicking the "Reload" button in the panel, eliminating the need to restart GNOME Shell during development.

See `03-development-workflow.md` for the updated development workflow.
