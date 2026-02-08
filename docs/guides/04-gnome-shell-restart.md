# Restarting GNOME Shell

## When Do You Need to Restart?

With sutto's **self-reload feature**, you rarely need to restart GNOME Shell:

- **First time installing** an extension: Yes (one-time only)
- **Updating existing extension during development**: No (use the "Reload" button)
- **Installing GNOME Shell updates**: Yes

## Self-Reload Feature (Recommended)

**For extension development, use the built-in "Reload" button instead of restarting GNOME Shell.**

See `03-development-workflow.md` for details.

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

**Good news:** After the initial installation, sutto's built-in "Reload" button allows you to reload the extension instantly without restarting GNOME Shell!

The methods described above are only needed for:
- Initial installation
- System updates
- Troubleshooting severe errors

For normal development, see `03-development-workflow.md` for the recommended self-reload workflow.
