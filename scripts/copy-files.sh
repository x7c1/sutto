#!/bin/bash
# Reload GNOME Shell extension after building

set -e

EXTENSION_UUID="sutto@x7c1.github.io"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Error: dist/ directory not found. Please run 'npm run build' first."
    exit 1
fi

# Create extension directory if it doesn't exist
mkdir -p "$EXTENSION_DIR"

# Copy files from dist/ to extension directory
echo "Copying files from dist/ to $EXTENSION_DIR..."
cp -r dist/* "$EXTENSION_DIR/"

echo "Files copied successfully!"
