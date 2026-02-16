# Demo GIF Generation Investigation Results

## Overview

This document summarizes the investigation into automated demo GIF generation for the sutto GNOME Shell extension. The goal was to programmatically control mouse cursor movement in a GNOME VM environment to record demonstration GIFs. **The investigation concluded that reliable visual cursor movement in a QEMU/KVM VM is not achievable with the approaches tested.**

## Environment

- **Host**: Linux (Ubuntu)
- **VM**: QEMU/KVM with Ubuntu 24.04
- **Desktop**: GNOME Shell 46 with Mutter compositor
- **Display protocols tested**: SPICE (QXL), VNC
- **Session types tested**: X11 (Wayland disabled)

## Core Problem

In GNOME Shell/Mutter running inside a QEMU VM:
- **X11 pointer position can be changed** programmatically (verified with `xdotool getmouselocation`)
- **Mouse clicks work** at the programmatic position
- **Visual cursor does not move** on screen or in recordings

Mutter renders the cursor independently from the X11 pointer position. In a VM environment, this disconnect prevents programmatic cursor control from being visible.

## Approaches Tested

### 1. xdotool (X11)

```bash
DISPLAY=:0 xdotool mousemove 500 500
```

**Result**: ❌ Failed
- X pointer position changes (confirmed with `xdotool getmouselocation`)
- Visual cursor remains stationary
- Clicks execute at the new position but cursor doesn't visually move

### 2. xte (xautomation)

```bash
DISPLAY=:0 xte 'mousemove 500 500'
```

**Result**: ❌ Failed
- Same behavior as xdotool
- X position changes, visual cursor doesn't move

### 3. python-xlib

```python
from Xlib import X, display
d = display.Display()
root = d.screen().root
root.warp_pointer(500, 500)
d.sync()
```

**Result**: ❌ Failed
- Same behavior as xdotool/xte
- Directly uses X11 protocol, still no visual cursor movement

### 4. evdev/uinput (Absolute Positioning)

```python
from evdev import UInput, AbsInfo, ecodes

cap = {
    ecodes.EV_KEY: [ecodes.BTN_LEFT, ecodes.BTN_RIGHT],
    ecodes.EV_ABS: [
        (ecodes.ABS_X, AbsInfo(value=0, min=0, max=1920, fuzz=0, flat=0, resolution=1)),
        (ecodes.ABS_Y, AbsInfo(value=0, min=0, max=1080, fuzz=0, flat=0, resolution=1)),
    ],
}
device = UInput(cap, name="virtual-tablet")
device.write(ecodes.EV_ABS, ecodes.ABS_X, 500)
device.write(ecodes.EV_ABS, ecodes.ABS_Y, 500)
device.syn()
```

**Result**: ❌ Failed
- Requires `python3-evdev` package and uinput permissions
- Device created successfully
- Cursor does not move visually

### 5. evdev/uinput (Relative Positioning)

```python
from evdev import UInput, ecodes

cap = {
    ecodes.EV_KEY: [ecodes.BTN_LEFT, ecodes.BTN_RIGHT],
    ecodes.EV_REL: [ecodes.REL_X, ecodes.REL_Y],
}
device = UInput(cap, name="virtual-mouse")
device.write(ecodes.EV_REL, ecodes.REL_X, 100)
device.write(ecodes.EV_REL, ecodes.REL_Y, 100)
device.syn()
```

**Result**: ❌ Failed
- Mimics physical mouse behavior (relative movement)
- Still no visual cursor movement in VM

### 6. SPICE Display Protocol

```bash
qemu-system-x86_64 ... \
    -spice port=5900,disable-ticketing=on \
    -device virtio-serial-pci \
    -device virtserialport,chardev=spicechannel0,name=com.redhat.spice.0 \
    -chardev spicevmc,id=spicechannel0,name=vdagent
```

**Result**: ❌ Failed
- SPICE with spice-vdagent for guest integration
- Cursor movement still not visible
- Suspected: SPICE client-side cursor rendering may interfere

### 7. VNC Display Protocol

```bash
qemu-system-x86_64 ... -vnc :0
```

**Result**: ❌ Failed
- VNC uses server-side cursor rendering (unlike SPICE)
- Expected this to work, but cursor still doesn't move
- Confirms the issue is in Mutter, not the display protocol

### 8. Dogtail / AT-SPI

```python
from dogtail.tree import root
app = root.application("gnome-shell")
element = app.child("Some Button")
element.click()
```

**Result**: ⚠️ Partial
- Can find and interact with UI elements via accessibility
- Clicks work
- Cursor still doesn't move visually (same underlying issue)

### 9. ydotool (Wayland-compatible)

```bash
ydotool mousemove -a 500 500
```

**Result**: ❌ Failed (on X11 session)
- ydotool 0.1.8 in Ubuntu 24.04 lacks ydotoold daemon
- Even with uinput approach, same visual cursor issue

## What Works

- **Keyboard input**: `xdotool key` works perfectly
- **Mouse clicks**: Clicks execute at programmatic position (just cursor doesn't move there visually)
- **GNOME Screencast**: Recording works once D-Bus session issues are resolved
- **GIF conversion**: ffmpeg + gifsicle pipeline works

## Technical Analysis

### Why This Happens

1. **Mutter's cursor management**: Mutter (GNOME's compositor) manages cursor rendering independently from X11. It uses Clutter for scene graph rendering, including the cursor.

2. **libinput vs X11 input**: Mutter primarily listens to libinput for pointer events, not X11 core input. When xdotool warps the pointer, it updates X11 state but doesn't generate libinput events that Mutter recognizes for cursor rendering.

3. **VM virtualization layer**: In QEMU/KVM, input devices are virtualized. Even uinput events may not propagate correctly through the virtualization layer to Mutter's input handling.

4. **Compositor isolation**: Modern Wayland-ready compositors like Mutter are designed to be more secure and isolated, which makes external input injection difficult by design.

## Artifacts Created

Despite the cursor movement failure, the following infrastructure was built:

```
scripts/demo/
├── packer/
│   ├── gnome-vm.pkr.hcl          # Packer template for VM image
│   ├── http/
│   │   └── user-data             # Ubuntu autoinstall configuration
│   ├── provision-1-gnome.sh      # GNOME desktop installation
│   └── provision-2-config.sh     # Configuration and tools
├── host/
│   ├── start_vm.py               # VM startup script
│   ├── wait_gnome.py             # GNOME readiness checker
│   ├── run.py                    # Main orchestration script
│   └── daemon_client.py          # Recording daemon client
└── guest/
    ├── daemon.py                 # Recording daemon (runs in GNOME session)
    ├── record.py                 # Recording control
    ├── convert_gif.py            # WebM to GIF conversion
    ├── lib/
    │   ├── input.py              # Input simulation (keyboard works)
    │   └── screencast.py         # GNOME Screencast D-Bus wrapper
    └── scenarios/                # Demo scenario scripts
```

## Alternative Approaches Not Tested

### Xephyr (Nested X Server)

Run GNOME in a nested X server on the host (no VM):

```bash
Xephyr :1 -screen 1920x1080 &
DISPLAY=:1 gnome-shell --wayland=false &
DISPLAY=:1 xdotool mousemove 500 500
```

**Potential**: May work since there's no virtualization layer. Requires GNOME packages on host.

### GNOME Shell Extension

Create an extension that exposes cursor control via D-Bus, running inside Mutter's process:

```javascript
// Extension could directly control cursor via Clutter
global.get_pointer();  // Get current position
// Direct Clutter manipulation for cursor
```

**Potential**: Most likely to work but requires significant development.

### Post-processing Cursor Overlay

Record without visible cursor, then overlay cursor animation in post-processing:

```bash
ffmpeg -i recording.webm -i cursor.png -filter_complex "overlay=x=...:y=..." output.webm
```

**Potential**: Works but requires cursor position logging and complex ffmpeg scripting.

### Physical/Hardware Input Injection

Use a device like USB Rubber Ducky or hardware input injection that appears as a real HID device to the VM.

**Potential**: Would work but defeats the purpose of software automation.

## Recommendations

1. **For keyboard-only scenarios**: Current infrastructure works. Use for demos that don't require visible mouse movement.

2. **For mouse-required scenarios**: Consider:
   - Manual recording on a real GNOME desktop
   - Xephyr approach (if host has GNOME)
   - GNOME Shell extension (significant development effort)

3. **Future investigation**: If revisiting this:
   - Test on physical hardware first to isolate VM issues
   - Investigate Mutter/Clutter source code for internal cursor control APIs
   - Consider Wayland-native approaches with a proper Wayland compositor

## Conclusion

Programmatic visual cursor control in a GNOME/Mutter VM environment is not achievable with standard input simulation tools. The compositor's security model and input handling architecture intentionally isolate cursor rendering from external manipulation. This is a fundamental limitation, not a configuration issue.

The infrastructure built during this investigation remains valuable for keyboard-based automation and could be extended if a working cursor control method is found in the future.
