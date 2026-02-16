#!/bin/bash
set -euo pipefail

echo "=== Installing GNOME Desktop ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ubuntu-desktop-minimal gdm3

echo "=== Setting graphical target ==="
systemctl set-default graphical.target

echo "=== Phase 1 complete, rebooting ==="
reboot
