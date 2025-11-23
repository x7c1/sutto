# Restarting GNOME Shell

## When Do You Need to Restart?

- **First time installing** an extension: Yes
- **Updating existing extension**: No (just disable/enable)
- **Installing GNOME Shell updates**: Yes

## Check Your Session Type First

```bash
echo $XDG_SESSION_TYPE
```

## Restart Methods

### X11 Session

#### Method 1: Using killall (Recommended)
```bash
killall -3 gnome-shell
```

#### Method 2: Using busctl
```bash
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")'
```

#### Method 3: Alt+F2 Dialog (Interactive)
1. Press `Alt + F2`
2. Type `r`
3. Press Enter

### Wayland Session

**Wayland does not support restarting GNOME Shell without logging out.**

You must:
- Logout and login again
- Or reboot the system

## Summary

| Session Type | Restart Command | Need Logout? |
|--------------|----------------|--------------|
| X11 | `killall -3 gnome-shell` | No |
| Wayland | N/A | Yes |

## For Extension Development

**Good news:** After the initial installation, you can reload extensions without restarting GNOME Shell!

See `03-development-workflow.md` for details.
