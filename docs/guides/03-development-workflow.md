# Development Workflow

## Reloading Extensions During Development

**Important:** You do NOT need to logout/login every time you make changes!

### Method 1: Disable and Enable (Recommended)

This is the simplest way to reload your extension after making code changes:

```bash
gnome-extensions disable snappa@x7c1.github.io
gnome-extensions enable snappa@x7c1.github.io
```

Or in one line:
```bash
gnome-extensions disable snappa@x7c1.github.io && gnome-extensions enable snappa@x7c1.github.io
```

### Method 2: Using D-Bus

```bash
gdbus call --session --dest org.gnome.Shell.Extensions \
  --object-path /org/gnome/Shell/Extensions \
  --method org.gnome.Shell.Extensions.ReloadExtension \
  "snappa@x7c1.github.io"
```

### Method 3: Looking Glass (Interactive Debugging)

1. Press `Alt + F2`
2. Type `lg` and press Enter
3. Use the Looking Glass interface for debugging

## Typical Development Cycle

### Method A: Manual Build (Simple)

```bash
# 1. Edit your TypeScript code
vim src/extension.ts

# 2. Build and reload in one command
npm run build && npm run reload
```

The `reload` command automatically:
- Copies files from `dist/` to the extension directory
- Disables and re-enables the extension

### Method B: Watch Mode (Recommended)

For faster development, use watch mode to automatically recompile on file changes:

```bash
# Terminal 1: Start watch mode
npm run watch

# Terminal 2: Edit code, then reload
vim src/extension.ts
# Save the file (watch mode auto-compiles)
npm run reload
```

## Using Symlinks for Faster Development

Instead of copying files every time, create a symlink to the `dist/` directory:

```bash
# Remove the directory if it exists
rm -rf ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io

# Create a symlink to your dist/ directory (build output)
ln -s /path/to/your/dev/directory/dist ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io
```

**Important:** The symlink points to `dist/`, not the project root, because that's where the compiled JavaScript lives.

With this setup:
1. Edit `src/extension.ts`
2. Files are auto-compiled (if using `npm run watch`)
3. Reload the extension manually:
   ```bash
   gnome-extensions disable snappa@x7c1.github.io && gnome-extensions enable snappa@x7c1.github.io
   ```

**Note:** When using symlinks, you don't need `npm run reload` (which copies files). Just disable/enable the extension directly.

## Viewing Extension Logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Or for specific errors:
```bash
journalctl /usr/bin/gnome-shell | grep -i error
```
