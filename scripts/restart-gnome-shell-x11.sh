#!/bin/bash
# Reload GNOME Shell extension using Alt+F2 'r' command (X11 only)

set -e

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Error: dist/ directory not found. Please run 'npm run build' first."
    exit 1
fi

# Check if running on X11
if [ "$XDG_SESSION_TYPE" != "x11" ]; then
    echo "Warning: This script is designed for X11. You're running: $XDG_SESSION_TYPE"
fi

# Restart GNOME Shell using Alt+F2 'r' command (X11 only)
echo "Restarting GNOME Shell (X11)..."

# Use xdotool to simulate Alt+F2 and type 'r'
if command -v xdotool &> /dev/null; then
    xdotool key alt+F2
    sleep 0.3
    xdotool type 'r'
    sleep 0.1
    xdotool key Return
    echo "GNOME Shell restart initiated via Alt+F2 r"
else
    # Fallback: use dbus to restart GNOME Shell
    echo "xdotool not found. Using dbus method..."
    dbus-send --type=method_call --dest=org.gnome.Shell /org/gnome/Shell org.gnome.Shell.Eval string:'global.reexec_self()' 2>/dev/null || {
        echo "dbus method failed. Please install xdotool or manually press Alt+F2 and type 'r'"
        exit 1
    }
fi

echo "Extension reloaded successfully!"
