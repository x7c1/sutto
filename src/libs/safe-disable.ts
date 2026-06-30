/**
 * Wrap a sibling teardown call so a throw in one branch cannot strand the
 * others. The reload-harden PR introduces this helper because GNOME Shell
 * silently leaves a wedged extension running when `disable()` throws part
 * way through — the D-Bus name stays claimed, the next reload's
 * `register_object` collides, and the user sees "old code is still in
 * memory" with no clear log line pointing at the cause.
 *
 * Logs the throw under the `[Sutto]` prefix and swallows it. The `label`
 * appears in the log so a failure is attributable to a specific sibling
 * (dbusReloader / controller / …).
 */
export function safeDisable(label: string, fn: () => void): void {
  try {
    fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[Sutto] disable(${label}) threw: ${msg}`);
  }
}
