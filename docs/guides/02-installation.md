# Installing GNOME Shell Extensions

## Extension Directory Location

GNOME Shell extensions are installed in:
```
~/.local/share/gnome-shell/extensions/<extension-uuid>/
```

## Installation Steps

### 1. Create Extension Directory

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io
```

The directory name **must match** the UUID in `metadata.json`.

### 2. Copy Extension Files

```bash
# Copy from your development directory
cp metadata.json extension.js ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/
```

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
