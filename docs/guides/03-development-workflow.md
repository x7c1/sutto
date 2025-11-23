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

```bash
# 1. Edit your code
vim extension.js

# 2. Copy to extension directory (if not using symlink)
cp extension.js ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io/

# 3. Reload the extension
gnome-extensions disable snappa@x7c1.github.io && gnome-extensions enable snappa@x7c1.github.io

# 4. Test the changes
```

## Using Symlinks for Faster Development

Instead of copying files every time, create a symlink:

```bash
# Remove the directory if it exists
rm -rf ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io

# Create a symlink to your development directory
ln -s /path/to/your/dev/directory ~/.local/share/gnome-shell/extensions/snappa@x7c1.github.io
```

Now you only need to reload the extension after editing files.

## Viewing Extension Logs

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

Or for specific errors:
```bash
journalctl /usr/bin/gnome-shell | grep -i error
```
