# Installation

## System Requirements

- GNOME Shell 46

## From GitHub Releases

1. Download the latest `.shell-extension.zip` from the [Releases page](https://github.com/x7c1/sutto/releases)

2. Install the downloaded file:
   ```bash
   gnome-extensions install sutto@x7c1.github.io.v6.shell-extension.zip
   ```
   Replace `v6` with the version you downloaded.

3. Restart GNOME Shell:
   - **X11**: Press `Alt+F2`, type `r`, and press Enter
   - **Wayland**: Log out and log back in

4. Enable the extension:
   ```bash
   gnome-extensions enable sutto@x7c1.github.io
   ```

## Verifying Installation

Check that the extension is installed and enabled:

```bash
gnome-extensions list
gnome-extensions info sutto@x7c1.github.io
```

You should see the extension listed with status "ENABLED".

## Recommended: Disable Built-in Edge Tiling

This step is optional, but recommended. Sutto opens its layout panel when you drag a window to a screen edge, and the desktop's own edge tiling reacts to the same gesture, so the two compete for the drag.

On Ubuntu, edge tiling is provided by the bundled Tiling Assistant extension:

```bash
gnome-extensions disable tiling-assistant@ubuntu.com
```

Then turn off GNOME's own edge tiling. On Ubuntu, run this after the command above, because disabling Tiling Assistant hands edge tiling back to GNOME:

```bash
gsettings set org.gnome.mutter edge-tiling false
```

To undo, run `gnome-extensions enable tiling-assistant@ubuntu.com` on Ubuntu, or `gsettings set org.gnome.mutter edge-tiling true` elsewhere.
