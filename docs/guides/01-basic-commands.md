# Basic GNOME Shell Commands

## Check GNOME Shell Version

```bash
gnome-shell --version
```

Example output:
```
GNOME Shell 50.1
```

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
