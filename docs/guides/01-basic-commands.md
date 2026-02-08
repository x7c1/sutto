# Basic GNOME Shell Commands

## Check GNOME Shell Version

```bash
gnome-shell --version
```

Example output:
```
GNOME Shell 42.9
```

## Check Session Type (X11 or Wayland)

```bash
echo $XDG_SESSION_TYPE
```

Output will be either:
- `x11` - X11 session
- `wayland` - Wayland session

## Check Distribution Information

```bash
cat /etc/os-release
```

This shows your Linux distribution name and version.

## List Installed Extensions

```bash
gnome-extensions list
```

## Check Extension Status

```bash
gnome-extensions info <extension-uuid>
```

Example:
```bash
gnome-extensions info sutto@x7c1.github.io
```
