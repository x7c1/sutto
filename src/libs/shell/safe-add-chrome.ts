import type Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export interface AddChromeOptions {
  trackFullscreen?: boolean;
  affectsStruts?: boolean;
}

/**
 * Wraps `Main.layoutManager.addChrome` with cleanup on failure.
 *
 * Shell 50's `addChrome` is not atomic: it parents `actor` to `uiGroup`
 * before validating `params`, so a `Params.parse` throw (e.g. an unknown
 * option key) leaves the actor parented to the chrome but absent from
 * `_trackedActors`. If that actor is reactive and full-screen, it silently
 * steals all pointer events for the rest of the session — the user has to
 * log out to recover. Destroying the actor here scopes the failure to the
 * call site and lets the original exception propagate normally.
 *
 * `AddChromeOptions` deliberately omits `affectsInputRegion` (which
 * `@girs/gnome-shell@50` still declares but Shell 50's runtime rejects)
 * so the compiler catches accidental reuse of that key.
 */
export function safeAddChrome(actor: Clutter.Actor, options?: AddChromeOptions): void {
  try {
    Main.layoutManager.addChrome(actor, options);
  } catch (error) {
    actor.destroy();
    throw error;
  }
}
