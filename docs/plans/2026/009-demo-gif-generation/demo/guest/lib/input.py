"""Input simulation library for smooth cursor movement and clicks.

Uses uinput for mouse control to work correctly with Mutter/GNOME Shell.
Mutter uses libinput which reads from evdev/uinput, not X11 input directly.
"""

import os
import subprocess
import time
from typing import Any

IS_WAYLAND = os.environ.get("XDG_SESSION_TYPE") == "wayland"

_last_x: int = 0
_last_y: int = 0
_uinput_device = None


def _get_uinput_device():
    """Get or create the uinput device for mouse control."""
    global _uinput_device
    if _uinput_device is not None:
        return _uinput_device

    try:
        from evdev import UInput, ecodes

        # Create a virtual mouse with relative positioning (like a real mouse)
        # Relative movement works more reliably with Mutter than absolute
        cap = {
            ecodes.EV_KEY: [ecodes.BTN_LEFT, ecodes.BTN_RIGHT, ecodes.BTN_MIDDLE],
            ecodes.EV_REL: [ecodes.REL_X, ecodes.REL_Y],
        }
        _uinput_device = UInput(cap, name="demo-virtual-mouse")
        return _uinput_device
    except Exception as e:
        print(f"Failed to create uinput device: {e}")
        return None


def _move_uinput_rel(dx: int, dy: int) -> bool:
    """Move cursor using uinput relative positioning."""
    try:
        from evdev import ecodes

        device = _get_uinput_device()
        if device is None:
            return False

        if dx:
            device.write(ecodes.EV_REL, ecodes.REL_X, dx)
        if dy:
            device.write(ecodes.EV_REL, ecodes.REL_Y, dy)
        device.syn()
        return True
    except Exception as e:
        print(f"uinput move failed: {e}")
        return False


def _click_uinput(button: int = 1) -> bool:
    """Click using uinput."""
    try:
        from evdev import ecodes

        device = _get_uinput_device()
        if device is None:
            return False

        btn_map = {1: ecodes.BTN_LEFT, 2: ecodes.BTN_MIDDLE, 3: ecodes.BTN_RIGHT}
        btn = btn_map.get(button, ecodes.BTN_LEFT)

        device.write(ecodes.EV_KEY, btn, 1)  # Press
        device.syn()
        time.sleep(0.05)
        device.write(ecodes.EV_KEY, btn, 0)  # Release
        device.syn()
        return True
    except Exception as e:
        print(f"uinput click failed: {e}")
        return False


def _mouse_tool(*args: str) -> subprocess.CompletedProcess:
    """Run xdotool (X11) or ydotool (Wayland) as fallback."""
    tool = "ydotool" if IS_WAYLAND else "xdotool"
    return subprocess.run([tool, *args], capture_output=True, text=True)


def _get_mouse_position() -> tuple[int, int]:
    """Get current mouse position."""
    global _last_x, _last_y

    if IS_WAYLAND:
        return _last_x, _last_y
    else:
        result = subprocess.run(
            ["xdotool", "getmouselocation", "--shell"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            loc = dict(
                line.split("=") for line in result.stdout.strip().split("\n") if "=" in line
            )
            return int(loc.get("X", 0)), int(loc.get("Y", 0))
        return _last_x, _last_y


def _update_position(x: int, y: int) -> None:
    """Update tracked position."""
    global _last_x, _last_y
    _last_x = x
    _last_y = y


def smooth_move(to_x: int, to_y: int, steps: int = 20, duration: float = 0.5) -> None:
    """Move cursor smoothly to target position.

    Args:
        to_x: Target X coordinate
        to_y: Target Y coordinate
        steps: Number of intermediate steps
        duration: Total duration in seconds
    """
    from_x, from_y = _get_mouse_position()
    total_dx = to_x - from_x
    total_dy = to_y - from_y

    # Track cumulative position for accurate final position
    moved_x = 0
    moved_y = 0

    # Check if uinput is available
    uinput_available = _get_uinput_device() is not None

    for i in range(steps + 1):
        t = i / steps
        # Use ease-in-out for more natural movement
        t = t * t * (3 - 2 * t)

        target_moved_x = int(total_dx * t)
        target_moved_y = int(total_dy * t)

        dx = target_moved_x - moved_x
        dy = target_moved_y - moved_y

        if uinput_available:
            # Use uinput relative movement for Mutter compatibility
            _move_uinput_rel(dx, dy)
        else:
            # Fall back to xdotool/ydotool with absolute positioning
            x = from_x + target_moved_x
            y = from_y + target_moved_y
            if IS_WAYLAND:
                _mouse_tool("mousemove", "--absolute", str(x), str(y))
            else:
                _mouse_tool("mousemove", str(x), str(y))

        moved_x = target_moved_x
        moved_y = target_moved_y
        time.sleep(duration / steps)

    _update_position(to_x, to_y)


def smooth_move_to_element(element: Any, offset_x: int = 0, offset_y: int = 0) -> None:
    """Move cursor smoothly to center of a Dogtail element.

    Args:
        element: Dogtail element with position and size attributes
        offset_x: Horizontal offset from center
        offset_y: Vertical offset from center
    """
    x = int(element.position[0] + element.size[0] / 2 + offset_x)
    y = int(element.position[1] + element.size[1] / 2 + offset_y)
    smooth_move(x, y)


def click(button: int = 1) -> None:
    """Click mouse button.

    Args:
        button: Button number (1=left, 2=middle, 3=right)
    """
    # Try uinput first for better Mutter compatibility
    if _click_uinput(button):
        return

    # Fall back to xdotool/ydotool
    if IS_WAYLAND:
        button_map = {1: "0x40", 2: "0x41", 3: "0x42"}  # ydotool button codes
        _mouse_tool("click", button_map.get(button, "0x40"))
    else:
        _mouse_tool("click", str(button))


def right_click() -> None:
    """Right-click at current position."""
    click(3)


def double_click() -> None:
    """Double-click at current position."""
    if IS_WAYLAND:
        _mouse_tool("click", "0x40")
        time.sleep(0.05)
        _mouse_tool("click", "0x40")
    else:
        _mouse_tool("click", "--repeat", "2", "--delay", "50", "1")


def mouse_down(button: int = 1) -> None:
    """Press mouse button down."""
    if IS_WAYLAND:
        button_map = {1: "0x40", 2: "0x41", 3: "0x42"}
        _mouse_tool("mousedown", button_map.get(button, "0x40"))
    else:
        _mouse_tool("mousedown", str(button))


def mouse_up(button: int = 1) -> None:
    """Release mouse button."""
    if IS_WAYLAND:
        button_map = {1: "0x40", 2: "0x41", 3: "0x42"}
        _mouse_tool("mouseup", button_map.get(button, "0x40"))
    else:
        _mouse_tool("mouseup", str(button))


def type_text(text: str, delay: float = 0.05) -> None:
    """Type text with natural delay between characters.

    Args:
        text: Text to type
        delay: Delay between characters in seconds
    """
    if IS_WAYLAND:
        _mouse_tool("type", "--delay", str(int(delay * 1000)), text)
    else:
        _mouse_tool("type", "--delay", str(int(delay * 1000)), text)


def key_press(*keys: str) -> None:
    """Press keyboard keys.

    Args:
        keys: Key names (e.g., "Return", "ctrl+c", "super")
    """
    if IS_WAYLAND:
        # ydotool uses different key names
        key_str = "+".join(keys)
        _mouse_tool("key", key_str)
    else:
        key_str = "+".join(keys)
        _mouse_tool("key", key_str)


def click_element(app_name: str, element_name: str, role: str | None = None) -> None:
    """Find element by name and click it with visible cursor movement.

    Args:
        app_name: Application name for Dogtail
        element_name: Element name or label to find
        role: Optional role name filter
    """
    from dogtail.tree import root

    app = root.application(app_name)
    if role:
        element = app.child(element_name, roleName=role)
    else:
        element = app.child(element_name)

    smooth_move_to_element(element)
    time.sleep(0.1)
    click()
