/**
 * Helpers for pruning stale `<base-uuid>-reload-<timestamp>` entries left
 * behind in GNOME Shell's `enabled-extensions` / `disabled-extensions`
 * GSettings arrays across repeated `npm run dev` cycles.
 *
 * Every reload registers a fresh UUID (e.g.
 * `sutto@x7c1.github.io-reload-1719300000000000`) and unloads the previous
 * one, but the previous UUID is never removed from the GSettings array. Over
 * time `enabled-extensions` fills up with dozens of stale reload UUIDs, which
 * makes it hard to reason about which extension instance is actually running
 * when debugging odd Shell behavior. `disabled-extensions` collects no new
 * entries — the reload sequence never calls `disableExtension()` — but is
 * pruned as well, to clear out what older versions left there.
 *
 * The pure {@link pruneStaleReloadUuids} function takes a UUID list and
 * returns a filtered copy with the stale entries removed; the orchestration
 * helper {@link pruneStaleReloadUuidsFromSettings} runs that filter against a
 * {@link ShellExtensionSettingsPort} for both keys, writing back only when
 * something actually changed so DConf stays quiet on no-ops.
 *
 * The canonical UUID (e.g. `sutto@x7c1.github.io`) and the currently-running
 * reload UUID are always preserved — the canonical one is the entry that keeps
 * GNOME Shell starting the extension on the next login (the reload copies live
 * in /tmp and are never scanned at startup), and the current reload UUID is
 * what's actually powering the live session.
 */

export interface ShellExtensionSettingsPort {
  getEnabledExtensions(): string[];
  setEnabledExtensions(uuids: string[]): void;
  getDisabledExtensions(): string[];
  setDisabledExtensions(uuids: string[]): void;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Return a copy of `uuids` with stale reload UUIDs removed.
 *
 * A UUID is considered a stale reload entry when it matches
 * `^<baseUuid>-reload-<digits>$` AND it is not the currently-running
 * `currentUuid`. Any other UUID (the canonical base UUID itself, unrelated
 * extensions, malformed reload-like names that don't end in digits) is left
 * untouched.
 */
export function pruneStaleReloadUuids(
  uuids: readonly string[],
  baseUuid: string,
  currentUuid: string
): string[] {
  const pattern = new RegExp(`^${escapeRegex(baseUuid)}-reload-\\d+$`);
  return uuids.filter((uuid) => uuid === currentUuid || !pattern.test(uuid));
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Prune stale reload UUIDs from both `enabled-extensions` and
 * `disabled-extensions`. Writes back only when the pruned list differs from
 * the original, so a clean session produces zero DConf writes.
 */
export function pruneStaleReloadUuidsFromSettings(
  settings: ShellExtensionSettingsPort,
  baseUuid: string,
  currentUuid: string
): void {
  const enabled = settings.getEnabledExtensions();
  const prunedEnabled = pruneStaleReloadUuids(enabled, baseUuid, currentUuid);
  if (!arraysEqual(enabled, prunedEnabled)) {
    settings.setEnabledExtensions(prunedEnabled);
  }

  const disabled = settings.getDisabledExtensions();
  const prunedDisabled = pruneStaleReloadUuids(disabled, baseUuid, currentUuid);
  if (!arraysEqual(disabled, prunedDisabled)) {
    settings.setDisabledExtensions(prunedDisabled);
  }
}
