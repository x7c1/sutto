# Demo GIF Generation

Status: Cancelled

## Overview

Build a system to automatically generate GIF animations demonstrating snappa usage via scripts. Fully scripted with no manual GUI operation required.

See [adr.md](./adr.md) for the decision to use a lightweight approach instead of openQA.

## Background

- Want to include snappa demo GIFs in README and documentation
- Manual recording lacks reproducibility and is tedious to update
- Need to record at display resolutions and multi-monitor setups not physically owned

## Requirements

- Fully controllable via scripts
- Simulate arbitrary display resolutions
- Simulate multi-monitor configurations
- Support both X11 and Wayland
- Mouse cursor must be visible
- Local execution only (CI is out of scope)

## Technical Approach

### Why VM?

snappa is a GNOME Shell extension that runs on GNOME Shell (Mutter). Xvfb or other X11 servers alone cannot run GNOME Shell, so a VM with a complete GNOME environment is required.

### Components

- **VM**: QEMU/KVM
  - Can set arbitrary virtual display resolutions
  - Can switch between X11/Wayland sessions
- **Image builder**: Packer
  - Reproducible VM image creation from script
- **OS**: Ubuntu or Fedora with GNOME
- **Auto-login**: Configure GDM for automatic login
- **Input simulation** (Python):
  - `Dogtail`: Find UI elements by name via AT-SPI
  - `xdotool` (X11) / `ydotool` (Wayland): Smooth cursor movement and clicks
  - `gnome-ponytail-daemon`: Required for Dogtail on Wayland
  - See [ui-automation-research.md](./ui-automation-research.md) for details
- **Screen recording**: GNOME Screencast (D-Bus API, works on both X11 and Wayland)
- **GIF conversion**: `ffmpeg` + `gifsicle`

## Implementation Plan

### Phase 1: VM Image Preparation

Use Packer to create reproducible VM images. Each developer builds the image locally from the same script.

- Packer template defining the VM image
- Automated OS installation (preseed/kickstart)
- Install required packages:
  - `python3`, `dogtail`, `gnome-ponytail-daemon`
  - `xdotool` (X11), `ydotool` (Wayland)
  - `ffmpeg`, `gifsicle`
  - `spice-vdagent`
- Configure GDM auto-login
- Install snappa
- Configure SSH access for script control

### Phase 2: Recording Scripts

- VM startup script (with resolution parameter)
- GNOME startup wait script
- Input simulation script (scenario execution)
- Recording start/stop script
- GIF conversion script

### Phase 3: Scenario Definition

- Define recording scenarios as Python scripts
  - Each scenario is a sequence of actions (mouse movement, clicks, wait times)
- Each scenario runs in both X11 and Wayland sessions
- Produces two GIFs per scenario for verification

## File Structure

```
scripts/
  demo/
    packer/
      gnome-vm.pkr.hcl    # Packer template
      preseed.cfg         # Ubuntu automated install config
      provision.sh        # Post-install provisioning script

    # Host-side scripts (control VM via SSH)
    host/
      start_vm.py         # Start VM with resolution parameter
      wait_gnome.py       # Wait for GNOME startup
      run.py              # Main orchestration script

    # Guest-side scripts (run inside VM)
    guest/
      lib/
        input.py          # Smooth cursor movement, click helpers
        screencast.py     # GNOME Screencast D-Bus wrapper
      scenarios/
        basic_usage.py    # Basic usage scenario
        multi_monitor.py  # Multi-monitor scenario
      record.py           # Recording execution entry point
      convert_gif.py      # Convert webm to GIF

    output/               # Generated GIFs (copied from VM)
      x11/
        basic-usage.gif
        multi-monitor.gif
      wayland/
        basic-usage.gif
        multi-monitor.gif
```

## Resolved Questions

### Screen Recording Method

Use GNOME Screencast via D-Bus API. This works on both X11 and Wayland sessions without permission dialogs.

```bash
# Start recording
gdbus call --session \
  --dest org.gnome.Shell.Screencast \
  --object-path /org/gnome/Shell/Screencast \
  --method org.gnome.Shell.Screencast.Screencast \
  '/tmp/recording.webm' '{}'

# Stop recording
gdbus call --session \
  --dest org.gnome.Shell.Screencast \
  --object-path /org/gnome/Shell/Screencast \
  --method org.gnome.Shell.Screencast.StopScreencast
```

Each scenario runs twice (X11 and Wayland), producing separate GIFs for verification.

### Cursor Movement for Recording

xdotool/ydotool move the cursor instantly by default, which looks unnatural in recordings. Use Python for smooth movement:

```python
import subprocess
import time
import os
from dogtail.tree import root

# Detect session type
IS_WAYLAND = os.environ.get("XDG_SESSION_TYPE") == "wayland"

def _mouse_tool(*args):
    """Run xdotool (X11) or ydotool (Wayland)."""
    tool = "ydotool" if IS_WAYLAND else "xdotool"
    subprocess.run([tool, *args])

def smooth_move(to_x: int, to_y: int, steps=20, duration=0.5):
    """Move cursor smoothly to target position."""
    # Get current position (xdotool only, ydotool needs different approach)
    if IS_WAYLAND:
        # On Wayland, start from a known position or use Dogtail
        from_x, from_y = 0, 0  # Simplified; real impl needs pointer query
    else:
        result = subprocess.run(
            ["xdotool", "getmouselocation", "--shell"],
            capture_output=True, text=True
        )
        loc = dict(line.split("=") for line in result.stdout.strip().split("\n"))
        from_x, from_y = int(loc["X"]), int(loc["Y"])

    for i in range(steps + 1):
        t = i / steps
        x = int(from_x + (to_x - from_x) * t)
        y = int(from_y + (to_y - from_y) * t)
        _mouse_tool("mousemove", str(x), str(y))
        time.sleep(duration / steps)

def click_element(app_name: str, element_name: str):
    """Find element and click with visible cursor movement."""
    element = root.application(app_name).child(element_name)
    x = int(element.position[0] + element.size[0] / 2)
    y = int(element.position[1] + element.size[1] / 2)
    smooth_move(x, y)
    _mouse_tool("click", "1")
```

Note: Getting current cursor position on Wayland requires additional handling (e.g., via Dogtail or tracking last known position).

### Multi-monitor simulation in QEMU

Linux guests support up to 4 displays with a single QXL device:

```bash
qemu-system-x86_64 \
  -vga qxl \
  -device qxl-vga,max_outputs=2,vram_size_mb=64 \
  -spice port=5900,disable-ticketing=on \
  ...
```

Guest requirements:
- Install `spice-vdagent` package
- Load `qxl` kernel module

Recording is done inside the VM using GNOME Screencast, not by capturing SPICE output.

## Out of Scope

- CI/CD execution (resource constraints)
