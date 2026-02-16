#!/bin/bash
# Setup script for uinput access in the VM
# Run this as root: sudo ./setup_uinput.sh

set -euo pipefail

DEMO_USER="${DEMO_USER:-demo}"

echo "=== Installing python3-evdev ==="
apt-get update
apt-get install -y python3-evdev

echo "=== Adding $DEMO_USER to input group ==="
usermod -aG input "$DEMO_USER"

echo "=== Creating udev rule for uinput ==="
cat > /etc/udev/rules.d/99-uinput.rules << 'EOF'
KERNEL=="uinput", GROUP="input", MODE="0660"
EOF

echo "=== Reloading udev rules ==="
udevadm control --reload-rules
udevadm trigger

echo "=== Checking /dev/uinput permissions ==="
ls -la /dev/uinput

echo ""
echo "=== Setup complete ==="
echo ""
echo "IMPORTANT: The user '$DEMO_USER' needs to log out and back in"
echo "for the group membership change to take effect."
echo ""
echo "To test immediately as root, run:"
echo "  sudo python3 ~/demo/test_uinput_mouse_rel.py"
echo ""
echo "After re-login as $DEMO_USER, test with:"
echo "  python3 ~/demo/test_uinput_mouse_rel.py"
