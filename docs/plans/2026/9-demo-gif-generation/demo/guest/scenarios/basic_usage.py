"""Basic usage scenario demonstrating sutto window snapping.

This scenario shows:
1. Opening a terminal window
2. Snapping it to the left half of the screen
3. Opening another window
4. Snapping it to the right half
"""

import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lib import smooth_move, click, key_press, type_text


def run() -> None:
    """Execute the basic usage scenario."""

    # Start from center of screen
    smooth_move(960, 540, duration=0.3)
    time.sleep(0.5)

    # Open Activities overview with Super key
    key_press("super")
    time.sleep(1.0)

    # Type to search for terminal
    type_text("terminal", delay=0.08)
    time.sleep(0.8)

    # Press Enter to launch
    key_press("Return")
    time.sleep(1.5)

    # Move cursor to terminal title bar area
    smooth_move(400, 50, duration=0.4)
    time.sleep(0.3)

    # Drag window to left edge to trigger sutto snap
    smooth_move(0, 400, duration=0.6)
    click()
    time.sleep(0.8)

    # Window should now be snapped to left half
    # Move cursor to center-right area
    smooth_move(1200, 540, duration=0.4)
    time.sleep(0.5)

    # Open Activities again for second window
    key_press("super")
    time.sleep(1.0)

    # Search for files/nautilus
    type_text("files", delay=0.08)
    time.sleep(0.8)

    # Launch Files
    key_press("Return")
    time.sleep(1.5)

    # Move to Files window title bar
    smooth_move(1200, 50, duration=0.4)
    time.sleep(0.3)

    # Drag to right edge
    smooth_move(1920, 400, duration=0.6)
    click()
    time.sleep(0.8)

    # Both windows now tiled side by side
    # Move cursor to center to show final result
    smooth_move(960, 540, duration=0.5)
    time.sleep(1.0)
