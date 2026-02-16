#!/bin/bash
set -euo pipefail

DEMO_USER="demo"

echo "=== Installing GNOME Desktop ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ubuntu-desktop-minimal gdm3

echo "=== Setting graphical target ==="
systemctl set-default graphical.target

echo "=== Installing required packages ==="
apt-get install -y \
    python3 \
    python3-pip \
    python3-gi \
    python3-dogtail \
    gnome-shell-extension-prefs \
    xdotool \
    ydotool \
    ffmpeg \
    gifsicle \
    spice-vdagent \
    at-spi2-core \
    libatspi2.0-0

echo "=== Installing gnome-ponytail-daemon for Wayland AT-SPI support ==="
pip3 install gnome-ponytail-daemon --break-system-packages || true

echo "=== Configuring GDM auto-login ==="
mkdir -p /etc/gdm3
cat > /etc/gdm3/custom.conf << 'EOF'
[daemon]
AutomaticLoginEnable=true
AutomaticLogin=demo

[security]

[xdmcp]

[chooser]

[debug]
EOF

echo "=== Enabling accessibility for AT-SPI ==="
sudo -u "$DEMO_USER" dbus-launch gsettings set org.gnome.desktop.interface toolkit-accessibility true || true

cat > /home/$DEMO_USER/.bash_profile << 'EOF'
export GTK_MODULES=gail:atk-bridge
export QT_ACCESSIBILITY=1
export ACCESSIBILITY_ENABLED=1
EOF
chown "$DEMO_USER:$DEMO_USER" /home/$DEMO_USER/.bash_profile

echo "=== Configuring ydotool for Wayland ==="
systemctl enable ydotool || true

echo "=== Creating demo scripts directory ==="
mkdir -p /home/$DEMO_USER/demo
chown -R "$DEMO_USER:$DEMO_USER" /home/$DEMO_USER/demo

echo "=== Installing sutto extension ==="
EXTENSION_DIR="/home/$DEMO_USER/.local/share/gnome-shell/extensions/sutto@example.com"
mkdir -p "$EXTENSION_DIR"
chown -R "$DEMO_USER:$DEMO_USER" /home/$DEMO_USER/.local

echo "=== Configuring SSH for script control ==="
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
systemctl enable ssh

echo "=== Setting default session type marker ==="
mkdir -p /home/$DEMO_USER/.config
cat > /home/$DEMO_USER/.config/session-type << 'EOF'
x11
EOF
chown -R "$DEMO_USER:$DEMO_USER" /home/$DEMO_USER/.config

echo "=== Provisioning complete ==="
