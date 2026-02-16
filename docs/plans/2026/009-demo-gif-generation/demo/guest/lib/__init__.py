"""Guest-side library for demo recording."""

from .input import (
    IS_WAYLAND,
    click,
    click_element,
    double_click,
    key_press,
    mouse_down,
    mouse_up,
    right_click,
    smooth_move,
    smooth_move_to_element,
    type_text,
)
from .screencast import Screencast

__all__ = [
    "IS_WAYLAND",
    "click",
    "click_element",
    "double_click",
    "key_press",
    "mouse_down",
    "mouse_up",
    "right_click",
    "smooth_move",
    "smooth_move_to_element",
    "type_text",
    "Screencast",
]
