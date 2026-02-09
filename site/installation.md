# Installation

## System Requirements

- GNOME Shell 46

## From GitHub Releases

1. Download the latest `.shell-extension.zip` from the [Releases page](https://github.com/x7c1/sutto/releases)

2. Install the extension:
   ```bash
   gnome-extensions install sutto@x7c1.github.io.shell-extension.zip
   ```

3. Restart GNOME Shell:
   - **X11**: Press `Alt+F2`, type `r`, and press Enter
   - **Wayland**: Log out and log back in

4. Enable the extension:
   ```bash
   gnome-extensions enable sutto@x7c1.github.io
   ```

## From Source (for Developers)

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/x7c1/sutto.git
   cd sutto
   npm install
   ```

2. Build and install:
   ```bash
   npm run build && npm run copy-files
   ```

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
