# Restarting GNOME Shell

## When Do You Need to Restart?

With sutto's **self-reload feature**, you rarely need to restart GNOME Shell:

- **First time installing** an extension: Yes (one-time only)
- **Updating existing extension during development**: No (use `npm run dev`)
- **Installing GNOME Shell updates**: Yes

## Self-Reload Feature (Recommended)

**For extension development, use `npm run dev` instead of restarting GNOME Shell.**

See [Development Workflow](03-development-workflow.md) for details.

## Restart Method

GNOME Shell 50 runs on Wayland only, and Wayland does not support restarting GNOME Shell without ending the session.

You must:

- Log out and log back in
- Or reboot the system

## For Extension Development

**Good news:** After the initial installation, `npm run dev` allows you to reload the extension instantly without restarting GNOME Shell.

The full session restart described above is only needed for:

- Initial installation
- System updates
- Troubleshooting severe errors

For normal development, see [Development Workflow](03-development-workflow.md) for the recommended self-reload workflow.
