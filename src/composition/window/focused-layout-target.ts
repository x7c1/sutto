/**
 * The focused window the panel can lay out, or null when there is none.
 *
 * A desktop surface (such as the one a desktop-icons extension draws) takes
 * focus when the user clicks the background, but it is not a window a layout
 * can be applied to, so it counts as no focused window.
 */

import Meta from 'gi://Meta';

export function getFocusedLayoutTarget(): Meta.Window | null {
  const window = global.display.get_focus_window();
  if (!window || window.get_window_type() === Meta.WindowType.DESKTOP) {
    return null;
  }
  return window;
}
