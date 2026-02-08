# UI Automation Research

## Overview

Research findings on how to automate GUI interactions for recording sutto demos. The key challenge is dynamically detecting UI element positions (e.g., settings window) that are outside sutto's control.

## Solution: Dogtail + AT-SPI

Dogtail is a GUI test tool and automation framework that uses GNOME's Accessibility (AT-SPI) technologies. It allows clicking UI elements by name rather than coordinates.

### Key Features

- **Name-based interaction**: Click buttons, menus, and other widgets by their accessible name
- **No hardcoded coordinates**: Works regardless of window position
- **X11 and Wayland support**: Wayland requires `gnome-ponytail-daemon`
- **Python API**: Easy to script

### Example Usage

```python
from dogtail.tree import root

# Find application
app = root.application("org.gnome.Settings")

# Click button by name
app.child("Apply").click()

# Find and interact with nested elements
dialog = app.child("Preferences", "dialog")
dialog.child("Save").click()
```

### Setup Requirements

Enable accessibility support in GNOME:

```bash
gsettings set org.gnome.desktop.interface toolkit-accessibility true
```

Install dogtail:

```bash
pip install dogtail
```

For Wayland, also install `gnome-ponytail-daemon`.

### Discovering Widget Names

Use `dogtail-sniff` to browse the accessibility tree of running applications:

```bash
dogtail-sniff
```

This tool shows the hierarchy of UI elements and their accessible names.

## Comparison: xdotool vs Dogtail

| Feature | xdotool | Dogtail |
|---------|---------|---------|
| Approach | Coordinate-based | Name-based |
| Window detection | By title/class | By application name |
| Button clicks | Requires coordinates | By element name |
| Wayland support | No (X11 only) | Yes (with daemon) |
| Dynamic UI | Difficult | Easy |

## Recommended Approach

Combine both tools:

- **xdotool**: Window management, keyboard shortcuts, mouse movement animations
- **Dogtail**: Clicking specific UI elements (buttons, menus, toggles)

This combination handles both fixed operations (keyboard shortcuts) and dynamic UI elements (dialogs, settings).

### Important: Cursor Visibility in Recordings

Dogtail's `click()` method uses AT-SPI to invoke the click action directly, **without moving the mouse cursor**. This means the cursor stays in place while the UI responds - which looks unnatural in demo recordings.

**Solution**: Use Dogtail to find element coordinates, then use xdotool for visible cursor movement:

```python
from dogtail.tree import root
import subprocess
import time

def click_element(app_name: str, element_name: str):
    """Find element with Dogtail, click with xdotool for visible cursor movement."""
    app = root.application(app_name)
    element = app.child(element_name)

    # Get element position and size
    pos = element.position
    size = element.size
    center_x = int(pos[0] + size[0] / 2)
    center_y = int(pos[1] + size[1] / 2)

    # Move cursor visibly (will be recorded)
    subprocess.run(["xdotool", "mousemove", "--sync", str(center_x), str(center_y)])
    time.sleep(0.1)  # Brief pause for visual effect

    # Click (will be recorded)
    subprocess.run(["xdotool", "click", "1"])

# Usage
click_element("org.gnome.Settings", "Apply")
```

This approach:
- **Dogtail**: Dynamically finds element coordinates (no hardcoding)
- **xdotool**: Moves cursor and clicks (visible in recording)

## References

- [dogtail - PyPI](https://pypi.org/project/dogtail/)
- [Automation through Accessibility - Fedora Magazine](https://fedoramagazine.org/automation-through-accessibility/)
- [Ubuntu Dogtail Tutorial](https://wiki.ubuntu.com/Testing/Automation/DogtailTutorial)
- [xdotool man page](https://manpages.ubuntu.com/manpages/trusty/man1/xdotool.1.html)
