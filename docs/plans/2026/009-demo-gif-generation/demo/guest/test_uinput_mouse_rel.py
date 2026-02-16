#!/usr/bin/env python3
"""Test script for uinput-based mouse movement using relative coordinates.

This version uses relative mouse movement (like a physical mouse) instead of
absolute positioning. This may work better with some compositors.
"""

import sys
import time


def test_uinput_mouse_rel():
    """Test uinput mouse movement using relative coordinates."""
    try:
        import evdev
        from evdev import UInput, ecodes
    except ImportError:
        print("ERROR: python3-evdev not installed")
        print("Run: sudo apt-get install python3-evdev")
        return False

    print("Creating uinput device (relative mouse)...")

    try:
        # Create a virtual mouse with relative positioning
        cap = {
            ecodes.EV_KEY: [ecodes.BTN_LEFT, ecodes.BTN_RIGHT, ecodes.BTN_MIDDLE],
            ecodes.EV_REL: [ecodes.REL_X, ecodes.REL_Y],
        }
        device = UInput(cap, name="test-virtual-mouse-rel")
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
    print("Moving mouse in a square pattern using relative movement...")
    print("Watch the cursor on screen!")
    print()

    # Move in a square pattern using relative coordinates
    # Each movement is a series of small relative moves
    movements = [
        ("right", 300, 0),
        ("down", 0, 300),
        ("left", -300, 0),
        ("up", 0, -300),
    ]

    try:
        for direction, total_x, total_y in movements:
            print(f"Moving {direction}...")
            steps = 30
            dx = total_x // steps
            dy = total_y // steps

            for _ in range(steps):
                if dx:
                    device.write(ecodes.EV_REL, ecodes.REL_X, dx)
                if dy:
                    device.write(ecodes.EV_REL, ecodes.REL_Y, dy)
                device.syn()
                time.sleep(0.02)

            time.sleep(0.3)

        print()
        print("Clicking...")
        device.write(ecodes.EV_KEY, ecodes.BTN_LEFT, 1)
        device.syn()
        time.sleep(0.1)
        device.write(ecodes.EV_KEY, ecodes.BTN_LEFT, 0)
        device.syn()

        print()
        print("Test complete!")
        print("If the cursor moved visually on screen, uinput relative mode is working.")
        return True

    finally:
        device.close()


if __name__ == "__main__":
    success = test_uinput_mouse_rel()
    sys.exit(0 if success else 1)
