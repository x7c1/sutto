# Installing GNOME Shell Extensions

## Prerequisites

- GNOME Shell 46
- Node.js and npm

## Install Dependencies

```bash
npm install
```

## Extension Directory Location

GNOME Shell extensions are installed in:
```
~/.local/share/gnome-shell/extensions/<extension-uuid>/
```

## Installation Steps

### 1. Build and Install

```bash
npm run build && npm run copy-files
```

This builds the TypeScript code and copies files to the extension directory.

### 2. Restart GNOME Shell (First Time Only)

#### For X11 Session:
```bash
killall -3 gnome-shell
```

#### For Wayland Session:
- Logout and login again
- Or reboot

### 3. Enable the Extension

```bash
gnome-extensions enable sutto@x7c1.github.io
```

### 4. Verify Installation

```bash
gnome-extensions list
gnome-extensions info sutto@x7c1.github.io
```

## After Installation

Once installed, you can use `npm run dev` to reload the extension without restarting GNOME Shell.

See `03-development-workflow.md` for the development workflow.
