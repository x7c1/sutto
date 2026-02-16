#!/usr/bin/env python3
"""Test script for uinput-based mouse movement.

Run this script inside the VM to test if uinput mouse control works.
Requires: python3-evdev and uinput access permissions.

Setup (run as root):
    apt-get install python3-evdev
    usermod -aG input demo
    echo 'KERNEL=="uinput", GROUP="input", MODE="0660"' > /etc/udev/rules.d/99-uinput.rules
    udevadm control --reload-rules
    udevadm trigger

Then log out and back in (or reboot) for group changes to take effect.
"""

import sys
import time


def test_uinput_mouse():
    """Test uinput mouse movement."""
    try:
        import evdev
        from evdev import UInput, AbsInfo, ecodes
    except ImportError:
        print("ERROR: python3-evdev not installed")
        print("Run: sudo apt-get install python3-evdev")
        return False

    print("Creating uinput device...")

    try:
        # Create a virtual tablet with absolute positioning
        cap = {
            ecodes.EV_KEY: [ecodes.BTN_LEFT, ecodes.BTN_RIGHT, ecodes.BTN_MIDDLE, ecodes.BTN_TOUCH],
            ecodes.EV_ABS: [
                (ecodes.ABS_X, AbsInfo(value=0, min=0, max=1920, fuzz=0, flat=0, resolution=1)),
                (ecodes.ABS_Y, AbsInfo(value=0, min=0, max=1080, fuzz=0, flat=0, resolution=1)),
            ],
        }
        device = UInput(cap, name="test-virtual-tablet", vendor=0x1234, product=0x5678)
        print(f"Created device: {device.device.path}")
    except PermissionError:
        print("ERROR: Permission denied accessing /dev/uinput")
        print("Make sure:")
        print("  1. User is in 'input' group: sudo usermod -aG input $USER")
        print("  2. udev rule exists: /etc/udev/rules.d/99-uinput.rules")
        print("  3. Log out and back in after group change")
        return False
    except Exception as e:
        print(f"ERROR: Failed to create uinput device: {e}")
        return False

    print("Device created successfully!")
    print()
    print("Moving mouse in a square pattern...")
    print("Watch the cursor on screen!")
    print()

    positions = [
        (500, 300),
        (800, 300),
        (800, 600),
        (500, 600),
        (500, 300),
    ]

    try:
        for x, y in positions:
            print(f"Moving to ({x}, {y})...")
            device.write(ecodes.EV_ABS, ecodes.ABS_X, x)
            device.write(ecodes.EV_ABS, ecodes.ABS_Y, y)
            device.syn()
            time.sleep(0.5)

        print()
        print("Clicking at center...")
        device.write(ecodes.EV_ABS, ecodes.ABS_X, 960)
        device.write(ecodes.EV_ABS, ecodes.ABS_Y, 540)
        device.syn()
        time.sleep(0.2)
        device.write(ecodes.EV_KEY, ecodes.BTN_LEFT, 1)
        device.syn()
        time.sleep(0.1)
        device.write(ecodes.EV_KEY, ecodes.BTN_LEFT, 0)
        device.syn()

        print()
        print("Test complete!")
        print("If the cursor moved visually on screen, uinput is working correctly.")
        return True

    finally:
        device.close()


if __name__ == "__main__":
    success = test_uinput_mouse()
    sys.exit(0 if success else 1)
