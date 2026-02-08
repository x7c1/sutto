# Demo GIF Generation

## Overview

This guide explains how to generate demo GIF animations for sutto documentation using a VM-based recording system. The system uses Packer to build a reproducible GNOME VM image, then records scripted scenarios inside the VM.

Key components:
- **Packer**: Builds the VM image with all required tools
- **QEMU/KVM**: Runs the VM with configurable display settings
- **Host scripts**: Orchestrate VM and recording process
- **Guest scripts**: Execute scenarios and record screen

## Prerequisites

### Required Packages

Install QEMU and KVM:

```bash
# Ubuntu/Debian
sudo apt install qemu-system-x86 qemu-kvm

# Fedora
sudo dnf install qemu-kvm

# Arch
sudo pacman -S qemu-full
```

Add your user to the KVM group:

```bash
sudo usermod -aG kvm $USER
newgrp kvm  # Apply immediately, or logout/login
```

Install SPICE client (for monitoring VM display):

```bash
# Ubuntu/Debian
sudo apt install virt-viewer
```

Install Packer:

```bash
# Ubuntu/Debian (via HashiCorp repository)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install packer

# Or download binary from https://developer.hashicorp.com/packer/downloads
```

## Building the VM Image

### 1. Initialize Packer Plugins

```bash
cd scripts/demo/packer
packer init gnome-vm.pkr.hcl
```

This downloads the QEMU plugin required by the template.

### 2. Build the Image

```bash
packer build gnome-vm.pkr.hcl
```

This process:
1. Downloads Ubuntu 24.04 Server ISO
2. Performs automated installation with cloud-init
3. Installs GNOME desktop and required packages
4. Configures auto-login and accessibility features
5. Copies guest scripts to the VM

The build takes 20-40 minutes depending on your internet connection and hardware.

Output: `output-sutto-demo/sutto-demo.qcow2`

### Build Options

Override default variables:

```bash
packer build \
  -var 'memory=8192' \
  -var 'cpus=4' \
  gnome-vm.pkr.hcl
```

Available variables:
| Variable | Default | Description |
|----------|---------|-------------|
| `memory` | 4096 | RAM in MB |
| `cpus` | 2 | Number of CPU cores |
| `disk_size` | 20G | Disk size |
| `ssh_username` | demo | VM user |
| `ssh_password` | demo | VM password |

## Starting the VM

```bash
cd scripts/demo
./host/start_vm.py --resolution 1920x1080
```

### Options

```bash
./host/start_vm.py \
  --resolution 1920x1080 \  # Display resolution
  --monitors 2 \            # Number of monitors (1-4)
  --session x11 \           # Session type (x11/wayland)
  --memory 4096 \           # RAM in MB
  --ssh-port 2222 \         # SSH port on host
  --spice-port 5900 \       # SPICE display port
  --headless                # Run without display
```

### Viewing the VM Display with SPICE

SPICE (Simple Protocol for Independent Computing Environments) is a remote display protocol developed by Red Hat for virtual machines. It transfers screen output, keyboard, and mouse input over the network.

Connect with a SPICE client to see the VM screen:

```bash
remote-viewer spice://localhost:5900
```

This is useful for:
- **Monitoring Packer builds**: Watch the OS installation progress and see what Packer's `boot_command` is typing
- **Debugging**: See error messages or installer prompts that might be blocking the build
- **Manual interaction**: If needed, interact with the VM directly

## Recording Demos

### Run All Scenarios

```bash
./host/run.py --all
```

This runs all scenarios in both X11 and Wayland sessions.

### Run Specific Scenario

```bash
./host/run.py --scenario basic_usage --session x11
```

### Options

```bash
./host/run.py \
  --scenario basic_usage \  # Scenario name (without .py)
  --session both \          # x11, wayland, or both
  --resolution 1920x1080 \  # Display resolution
  --ssh-port 2222 \         # SSH port
  --skip-vm-start \         # Assume VM is running
  --keep-webm               # Keep intermediate files
```

### Output

Generated GIFs are saved to:
```
scripts/demo/output/
  x11/
    basic-usage.gif
    multi-monitor.gif
  wayland/
    basic-usage.gif
    multi-monitor.gif
```

## Writing Scenarios

Scenarios are Python scripts in `scripts/demo/guest/scenarios/`.

### Basic Structure

```python
"""Scenario description."""

import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lib import smooth_move, click, key_press, type_text


def run() -> None:
    """Execute the scenario."""
    # Move cursor smoothly
    smooth_move(960, 540, duration=0.5)
    time.sleep(0.3)

    # Open Activities
    key_press("super")
    time.sleep(1.0)

    # Type to search
    type_text("terminal", delay=0.08)
    time.sleep(0.5)

    # Launch application
    key_press("Return")
    time.sleep(1.0)

    # Click at position
    click()
```

### Available Functions

From `lib.input`:
- `smooth_move(x, y, steps=20, duration=0.5)` - Move cursor smoothly
- `click(button=1)` - Click (1=left, 2=middle, 3=right)
- `right_click()` - Right-click
- `double_click()` - Double-click
- `mouse_down(button=1)` / `mouse_up(button=1)` - Press/release
- `type_text(text, delay=0.05)` - Type with delay
- `key_press(*keys)` - Press keys (e.g., "super", "Return", "ctrl+c")
- `click_element(app, name, role=None)` - Find and click UI element via AT-SPI

### Tips for Natural-Looking Recordings

1. Use `smooth_move()` instead of instant positioning
2. Add `time.sleep()` between actions for visual clarity
3. Use realistic typing delays (0.05-0.1s per character)
4. Pause briefly after window opens before next action

## Troubleshooting

### Packer Build Fails

**"qemu-system-x86_64 not found"**
```bash
sudo apt install qemu-system-x86 qemu-kvm
```

**"Could not access KVM kernel module"**
```bash
sudo usermod -aG kvm $USER
newgrp kvm
```

**ISO download fails (404)**

The ISO URL may be outdated. Check current releases at https://releases.ubuntu.com/24.04/ and update the URL/checksum in `gnome-vm.pkr.hcl`.

### VM Won't Start

**"Permission denied" for KVM**
```bash
ls -la /dev/kvm
# Should show your user has access via kvm group
```

### Recording Fails

**"Failed to start recording"**

GNOME Screencast service may not be ready. Increase the wait time in `wait_gnome.py` or check if GNOME Shell is running:

```bash
ssh -p 2222 demo@localhost "pgrep -x gnome-shell"
```

### GIF Conversion Fails

**"ffmpeg not found"**

The ffmpeg package is installed in the VM, not the host. Ensure the conversion runs inside the VM via the orchestration script.
