# Development Workflow

## Self-Reload Feature (Recommended)

Snappa includes a **built-in self-reload feature** that eliminates the need to restart GNOME Shell during development.

### How It Works

The extension displays a "Reload" button in the GNOME Shell top panel. When clicked, it:
1. Copies the current extension to `/tmp` with a new UUID
2. Loads the new code (bypassing GJS importer cache)
3. Unloads the old instance
4. Cleans up temporary files

This approach is inspired by [ExtensionReloader](https://codeberg.org/som/ExtensionReloader) and works without DBus Eval permissions.

### Development Cycle (Recommended)

```bash
# 1. Edit your TypeScript code
vim src/extension.ts

# 2. Build and copy files
npm run build && npm run copy-files

# 3. Click the "Reload" button in the panel
# → Extension reloads instantly (< 1 second)!
```

**Key Benefits:**
- No GNOME Shell restart required (saves several seconds)
- Works on both X11 and Wayland
- No need for xdotool or other external tools
- Code changes are reflected immediately

### Alternative: Watch Mode

For even faster iteration:

```bash
# Terminal 1: Start watch mode
npm run watch

# Terminal 2: After editing and saving
npm run copy-files
# Then click the "Reload" button
```

## Legacy Methods (Not Recommended)

### Method 1: Disable and Enable

**Note:** This method may not work reliably due to GJS importer caching.

```bash
gnome-extensions disable snappa@x7c1.github.io
gnome-extensions enable snappa@x7c1.github.io
```

### Method 2: GNOME Shell Restart

**Note:** This is slow and unnecessary with the self-reload feature.

For X11:
```bash
# Alt+F2 → type 'r' → Enter
# Or use xdotool:
./scripts/reload-extension-x11.sh
```

For Wayland:
- Must logout/login (not recommended during development)

### Method 3: Looking Glass (Interactive Debugging)

1. Press `Alt + F2`
2. Type `lg` and press Enter
3. Use the Looking Glass interface for debugging

## Viewing Extension Logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Or for specific errors:
```bash
journalctl /usr/bin/gnome-shell | grep -i error
```
