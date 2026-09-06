/**
 * Extension Reloader
 *
 * A reusable utility for hot-reloading GNOME Shell extensions during development.
 * Inspired by ExtensionReloader (https://codeberg.org/som/ExtensionReloader).
 *
 * Usage:
 *   const reloader = new Reloader('your-extension@example.com');
 *   reloader.reload(); // Call this to reload the extension
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { ExtensionType } from 'resource:///org/gnome/shell/misc/extensionUtils.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { ExtensionObject } from '@girs/gnome-shell/dist/types/extension-object.js';
import type { ExtensionManager } from '@girs/gnome-shell/dist/ui/extensionSystem.js';
import { GioShellExtensionSettings } from './gio-shell-extension-settings.js';
import {
  pruneStaleReloadUuidsFromSettings,
  type ShellExtensionSettingsPort,
} from './prune-stale-uuids.js';

// Declare TextEncoder/TextDecoder for TypeScript
declare class TextDecoder {
  constructor(encoding: string);
  decode(data: Uint8Array): string;
}
declare class TextEncoder {
  encode(text: string): Uint8Array;
}

/**
 * GNOME Shell's `ExtensionState.ACTIVE`.
 *
 * Spelled as a numeric literal because this particular enum's member names
 * drifted (`ExtensionType`, exported by the same module, did not):
 * `@girs/gnome-shell` 50.0.0 still declares `ENABLED`/`DISABLED`, while the
 * object that `resource:///org/gnome/shell/misc/extensionUtils.js` exports in
 * Shell 50 has `ACTIVE`/`INACTIVE`. Importing the enum and writing
 * `ExtensionState.ENABLED` would therefore type-check but evaluate to
 * `undefined` against the real runtime object. The numeric values did not
 * change (`ENABLED` and `ACTIVE` are both 1).
 */
const EXTENSION_STATE_ACTIVE = 1;

/**
 * Type guard to safely extract error message from unknown error
 */
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    return e.message;
  }
  return String(e);
}

export class Reloader {
  private originalUuid: string;
  private currentUuid: string;
  private extensionDir: string;
  private shellExtensionSettings: ShellExtensionSettingsPort;

  /**
   * Create a new Reloader instance
   * @param uuid The extension UUID (e.g., 'my-extension@example.com')
   * @param currentUuid Optional current UUID (used internally for reloaded instances)
   * @param shellExtensionSettings Optional port for reading/writing the
   *   `org.gnome.shell` extension GSettings arrays. Defaults to a Gio-backed
   *   implementation; tests inject an in-memory fake.
   */
  constructor(
    uuid: string,
    currentUuid?: string,
    shellExtensionSettings?: ShellExtensionSettingsPort
  ) {
    this.originalUuid = uuid;
    this.currentUuid = currentUuid || uuid;
    this.extensionDir = `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${this.originalUuid}`;
    this.shellExtensionSettings = shellExtensionSettings ?? new GioShellExtensionSettings();
  }

  /**
   * Reload the extension by creating a temporary copy with a new UUID
   */
  async reload(): Promise<void> {
    try {
      console.log('[Reloader] Starting reload...');

      const extensionManager = Main.extensionManager;

      // Clean up old instances
      this.cleanupOldInstances(extensionManager);

      // Unload the old extension first to unregister its D-Bus interface.
      // `unloadExtension()` runs the same disable path as `disableExtension()`
      // (it calls `disable()`, rebases the extensions enabled after this one,
      // and marks the extension inactive) and then drops the object from the
      // manager, but it never writes GSettings. `disableExtension()` would
      // move the canonical UUID from `enabled-extensions` into
      // `disabled-extensions`, leaving the extension dead after the next
      // login: startup only scans the XDG data dirs, so the `-reload-` UUID
      // that stays behind in `enabled-extensions` resolves to nothing.
      // This runs BEFORE any tmp-dir creation so that an aborted reload
      // leaves no orphan files behind.
      console.log('[Reloader] Unloading old extension...');
      const oldExtension = extensionManager.lookup(this.currentUuid) as ExtensionObject | undefined;
      if (!oldExtension || oldExtension.state !== EXTENSION_STATE_ACTIVE) {
        // The realistic trigger is a previous instance whose own `enable()`
        // threw: GNOME Shell parks it in `ExtensionState.ERROR` (3) without
        // ever calling `disable()`, so it still holds the D-Bus name and its
        // `error` carries the message that exception raised.
        const reason = oldExtension
          ? `it is in state ${oldExtension.state} instead of ACTIVE` +
            (oldExtension.error ? ` (${oldExtension.error})` : '')
          : 'the extension manager does not know it';
        console.error(
          `[Reloader] Aborting reload: cannot unload '${this.currentUuid}' because ${reason}.`
        );
        console.error(
          '[Reloader] unloadExtension() skips disable() for a non-active extension, so the ' +
            'previous instance may still be holding the D-Bus interface name.'
        );
        console.error(
          '[Reloader] Recovery: logout/login required (Wayland cannot restart gnome-shell).'
        );
        throw new Error(`Cannot unload ${this.currentUuid}: extension is not active`);
      }
      await extensionManager.unloadExtension(oldExtension);

      // Wait for D-Bus interface to fully unregister
      await this.waitAsync(100);

      // Prepare new UUID and directory
      const timestamp = GLib.get_real_time();
      const newUuid = `${this.originalUuid}-reload-${timestamp}`;
      const tmpDir = `/tmp/${newUuid}`;

      // Copy files and update metadata
      const tmpDirFile = this.copyFilesToTemp(tmpDir);
      this.updateMetadata(tmpDirFile, newUuid);

      // The reload copy lives under /tmp and is owned by the user, so it is
      // registered as a PER_USER extension.
      extensionManager.createExtensionObject(newUuid, tmpDirFile, ExtensionType.PER_USER);

      // Shell 50 does return the object it creates, but `@girs/gnome-shell`
      // 50.0.0 declares the return type as `void`, so look it up instead.
      // The assertion is needed because `lookup()`'s signature omits
      // `undefined`, which it does return at runtime for an unknown UUID.
      const newExtension = extensionManager.lookup(newUuid) as ExtensionObject | undefined;
      if (!newExtension) {
        throw new Error(`Failed to create extension object for ${newUuid}`);
      }

      await extensionManager.loadExtension(newExtension);

      // Must run BEFORE the new UUID is enabled: pruning writes to the
      // `org.gnome.shell` extension arrays, and GNOME Shell's
      // `_onEnabledExtensionsChanged()` handler is async.
      // A write that lands while the enable of the new UUID is still in flight
      // starts a second enable of the same UUID (it is not yet recorded as
      // enabled), which constructs and enables the extension twice and leaves
      // an orphaned instance holding the D-Bus name. Running it here is safe:
      // the new UUID is in neither array yet (`createExtensionObject` and
      // `loadExtension` never write GSettings), and every UUID this write
      // removes was either unloaded above or is a leftover from an earlier
      // session that was never loaded here, so the handler this write triggers
      // has nothing to enable or disable. The new UUID is also passed through
      // as the UUID to preserve, so the prune cannot drop the instance we are
      // about to enable.
      this.pruneStaleReloadUuidsFromGSettings(newUuid);

      const enableSuccess = extensionManager.enableExtension(newUuid);
      if (!enableSuccess) {
        throw new Error(`Failed to enable extension ${newUuid}`);
      }

      // Clean up temp dirs left behind by earlier reload cycles.
      this.cleanupTempDirs(tmpDir);

      console.log('[Reloader] Reload complete!');
    } catch (e: unknown) {
      console.log(`[Reloader] Failed to reload: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Clean up old reload instances.
   *
   * `unloadExtension()` never writes GSettings, so the stale UUIDs it leaves
   * in the `org.gnome.shell` arrays are removed later by
   * {@link pruneStaleReloadUuidsFromGSettings}.
   */
  private cleanupOldInstances(extensionManager: ExtensionManager): void {
    const uuids = extensionManager.getUuids();
    for (const uuid of uuids) {
      if (uuid.includes('-reload-') && uuid !== this.currentUuid) {
        try {
          const extension = extensionManager.lookup(uuid) as ExtensionObject | undefined;
          if (extension) {
            extensionManager.unloadExtension(extension);
          }
        } catch (e: unknown) {
          console.log(`[Reloader] Error removing ${uuid}: ${getErrorMessage(e)}`);
        }
      }
    }
  }

  /**
   * Copy extension files to temporary directory
   */
  private copyFilesToTemp(tmpDir: string): Gio.File {
    GLib.mkdir_with_parents(tmpDir, 0o755);

    const sourceDir = Gio.File.new_for_path(this.extensionDir);
    const tmpDirFile = Gio.File.new_for_path(tmpDir);

    const enumerator = sourceDir.enumerate_children(
      'standard::name,standard::type',
      Gio.FileQueryInfoFlags.NONE,
      null
    );

    while (true) {
      const fileInfo = enumerator.next_file(null);
      if (fileInfo === null) {
        break;
      }
      const name = fileInfo.get_name();
      const fileType = fileInfo.get_file_type();

      const sourceFile = sourceDir.get_child(name);
      const destFile = tmpDirFile.get_child(name);

      if (fileType === Gio.FileType.REGULAR) {
        // Copy regular files
        sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
      } else if (fileType === Gio.FileType.DIRECTORY) {
        // Recursively copy directories (needed for schemas/)
        this.copyDirectoryRecursive(sourceFile, destFile);
      }
    }

    return tmpDirFile;
  }

  /**
   * Recursively copy a directory and its contents
   */
  private copyDirectoryRecursive(sourceDir: Gio.File, destDir: Gio.File): void {
    // Create destination directory
    if (!destDir.query_exists(null)) {
      destDir.make_directory_with_parents(null);
    }

    const enumerator = sourceDir.enumerate_children(
      'standard::name,standard::type',
      Gio.FileQueryInfoFlags.NONE,
      null
    );

    while (true) {
      const fileInfo = enumerator.next_file(null);
      if (fileInfo === null) {
        break;
      }
      const name = fileInfo.get_name();
      const fileType = fileInfo.get_file_type();

      const sourceFile = sourceDir.get_child(name);
      const destFile = destDir.get_child(name);

      if (fileType === Gio.FileType.REGULAR) {
        sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
      } else if (fileType === Gio.FileType.DIRECTORY) {
        this.copyDirectoryRecursive(sourceFile, destFile);
      }
    }
  }

  /**
   * Update metadata.json with new UUID
   */
  private updateMetadata(tmpDirFile: Gio.File, newUuid: string): void {
    const metadataFile = tmpDirFile.get_child('metadata.json');

    if (!metadataFile.query_exists(null)) {
      throw new Error('metadata.json not found');
    }

    const [success, contents] = metadataFile.load_contents(null);
    if (!success) {
      throw new Error('Failed to load metadata.json');
    }

    const metadataText = new TextDecoder('utf-8').decode(contents);
    const metadata = JSON.parse(metadataText);
    metadata.uuid = newUuid;

    const newContents = new TextEncoder().encode(JSON.stringify(metadata, null, 2));
    metadataFile.replace_contents(
      newContents,
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null
    );
  }

  /**
   * Remove stale `<originalUuid>-reload-<digits>` entries that previous
   * reload cycles left behind in GNOME Shell's `enabled-extensions` and
   * `disabled-extensions` GSettings arrays. The canonical UUID and the
   * currently-running reload UUID are preserved.
   */
  private pruneStaleReloadUuidsFromGSettings(currentReloadUuid: string): void {
    try {
      pruneStaleReloadUuidsFromSettings(
        this.shellExtensionSettings,
        this.originalUuid,
        currentReloadUuid
      );
    } catch (e: unknown) {
      console.log(`[Reloader] Failed to prune stale reload UUIDs: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Clean up old temporary directories
   */
  private cleanupTempDirs(currentTmpDir: string): void {
    const currentTmpName = currentTmpDir.split('/').pop();
    const cleanupCommand = `sh -c "cd /tmp && ls -d ${this.originalUuid}-reload-* 2>/dev/null | grep -v '${currentTmpName}' | xargs rm -rf"`;
    GLib.spawn_command_line_async(cleanupCommand);
  }

  /**
   * Wait asynchronously using GLib timeout
   */
  private waitAsync(ms: number): Promise<void> {
    return new Promise((resolve) => {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
        resolve();
        return GLib.SOURCE_REMOVE;
      });
    });
  }
}
