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
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

// Declare TextEncoder/TextDecoder for TypeScript
declare class TextDecoder {
  constructor(encoding: string);
  decode(data: Uint8Array): string;
}
declare class TextEncoder {
  encode(text: string): Uint8Array;
}

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

  /**
   * Create a new Reloader instance
   * @param uuid The extension UUID (e.g., 'my-extension@example.com')
   * @param currentUuid Optional current UUID (used internally for reloaded instances)
   */
  constructor(uuid: string, currentUuid?: string) {
    this.originalUuid = uuid;
    this.currentUuid = currentUuid || uuid;
    this.extensionDir = `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${this.originalUuid}`;
  }

  /**
   * Reload the extension by creating a temporary copy with a new UUID
   */
  reload(): void {
    try {
      console.log('[Reloader] Starting reload...');

      const extensionManager = (Main as any).extensionManager;

      // Clean up old instances
      this.cleanupOldInstances(extensionManager);

      // Prepare new UUID and directory
      const timestamp = GLib.get_real_time();
      const newUuid = `${this.originalUuid}-reload-${timestamp}`;
      const tmpDir = `/tmp/${newUuid}`;

      // Copy files and update metadata
      const tmpDirFile = this.copyFilesToTemp(tmpDir);
      this.updateMetadata(tmpDirFile, newUuid);

      // Disable old extension first to unregister D-Bus interface
      console.log('[Reloader] Disabling old extension...');
      extensionManager.disableExtension(this.currentUuid);

      // Load new extension after a short delay
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
        try {
          const newExtension = extensionManager.createExtensionObject(
            newUuid,
            tmpDirFile,
            1 // ExtensionType.PER_USER
          );

          extensionManager.loadExtension(newExtension);
          extensionManager.enableExtension(newUuid);

          // Clean up old files and extension
          this.cleanupTempDirs(tmpDir);
          this.unloadOldExtension(extensionManager, this.currentUuid);

          console.log('[Reloader] Reload complete!');
        } catch (e: unknown) {
          console.log(`[Reloader] Error during reload: ${getErrorMessage(e)}`);
        }

        return GLib.SOURCE_REMOVE;
      });
    } catch (e: unknown) {
      console.log(`[Reloader] Failed to reload: ${getErrorMessage(e)}`);
    }
  }

  /**
   * Clean up old reload instances
   */
  private cleanupOldInstances(extensionManager: any): void {
    const allExtensions = extensionManager._extensions;
    for (const [uuid, extension] of Object.entries(allExtensions)) {
      if ((uuid as string).includes('-reload-') && uuid !== this.currentUuid) {
        try {
          extensionManager.disableExtension(uuid);
          extensionManager.unloadExtension(extension);
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
   * Unload old extension instance (already disabled)
   */
  private unloadOldExtension(extensionManager: any, uuid: string): void {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
      const oldExtension = extensionManager.lookup(uuid);
      if (!oldExtension) {
        return GLib.SOURCE_REMOVE;
      }

      try {
        extensionManager.unloadExtension(oldExtension);
        console.log(`[Reloader] Successfully unloaded: ${uuid}`);
      } catch (e: unknown) {
        console.log(`[Reloader] Error unloading: ${getErrorMessage(e)}`);
      }

      return GLib.SOURCE_REMOVE;
    });
  }

  /**
   * Clean up old temporary directories
   */
  private cleanupTempDirs(currentTmpDir: string): void {
    const currentTmpName = currentTmpDir.split('/').pop();
    const cleanupCommand = `sh -c "cd /tmp && ls -d ${this.originalUuid}-reload-* 2>/dev/null | grep -v '${currentTmpName}' | xargs rm -rf"`;
    GLib.spawn_command_line_async(cleanupCommand);
  }
}
