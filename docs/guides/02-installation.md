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

### 2. Create Extension Directory

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io
```

The directory name **must match** the UUID in `metadata.json`.

### 3. Copy Extension Files

```bash
# Copy all files from the dist/ directory (build output)
cp dist/* ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/
```

**Note:** Copy files from `dist/`, not from the project root. The `dist/` directory contains the compiled JavaScript and metadata.

### 4. Restart GNOME Shell (First Time Only)

#### For X11 Session:
```bash
killall -3 gnome-shell
```

#### For Wayland Session:
- Logout and login again
- Or reboot

### 5. Enable the Extension

```bash
gnome-extensions enable snappa@x7c1.github.io
```

### 6. Verify Installation

```bash
gnome-extensions list
gnome-extensions info snappa@x7c1.github.io
```
