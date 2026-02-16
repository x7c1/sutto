"""Multi-monitor scenario demonstrating sutto across displays.

This scenario shows:
1. Opening windows on the primary monitor
2. Moving windows between monitors
3. Snapping windows on different monitors

Requires VM to be started with --monitors 2
"""

import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from lib import smooth_move, click, key_press, type_text, mouse_down, mouse_up

# Assuming two 1920x1080 monitors side by side
MONITOR_1_CENTER = (960, 540)
MONITOR_2_CENTER = (2880, 540)  # 1920 + 960
MONITOR_BOUNDARY = 1920


def run() -> None:
    """Execute the multi-monitor scenario."""

    # Start on primary monitor
    smooth_move(*MONITOR_1_CENTER, duration=0.3)
    time.sleep(0.5)

    # Open terminal on monitor 1
    key_press("super")
    time.sleep(1.0)

    type_text("terminal", delay=0.08)
    time.sleep(0.8)

    key_press("Return")
    time.sleep(1.5)

    # Move terminal to title bar
    smooth_move(500, 50, duration=0.3)
    time.sleep(0.3)

    # Drag terminal to left half of monitor 1
    mouse_down()
    time.sleep(0.1)
    smooth_move(0, 400, duration=0.5)
    mouse_up()
    time.sleep(0.8)

    # Open Files on monitor 1 first
    key_press("super")
    time.sleep(1.0)

    type_text("files", delay=0.08)
    time.sleep(0.8)

    key_press("Return")
    time.sleep(1.5)

    # Move Files window title bar
    smooth_move(1200, 50, duration=0.3)
    time.sleep(0.3)

    # Drag Files across to monitor 2
    mouse_down()
    time.sleep(0.1)
    smooth_move(MONITOR_BOUNDARY + 400, 300, duration=0.8)
    mouse_up()
    time.sleep(0.5)

    # Now snap Files to left half of monitor 2
    smooth_move(MONITOR_2_CENTER[0] - 400, 50, duration=0.3)
    time.sleep(0.2)

    mouse_down()
    time.sleep(0.1)
    smooth_move(MONITOR_BOUNDARY, 400, duration=0.5)
    mouse_up()
    time.sleep(0.8)

    # Open another window (Text Editor) on monitor 2
    key_press("super")
    time.sleep(1.0)

    type_text("text editor", delay=0.08)
    time.sleep(0.8)

    key_press("Return")
    time.sleep(1.5)

    # Snap Text Editor to right half of monitor 2
    smooth_move(MONITOR_2_CENTER[0] + 200, 50, duration=0.3)
    time.sleep(0.2)

    mouse_down()
    time.sleep(0.1)
    smooth_move(MONITOR_BOUNDARY + 1920, 400, duration=0.5)
    mouse_up()
    time.sleep(0.8)

    # Pan across both monitors to show final layout
    smooth_move(*MONITOR_1_CENTER, duration=0.6)
    time.sleep(0.5)

    smooth_move(*MONITOR_2_CENTER, duration=0.8)
    time.sleep(0.5)

    smooth_move(MONITOR_BOUNDARY, 540, duration=0.5)
    time.sleep(1.0)
