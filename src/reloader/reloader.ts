/// <reference path="../types/gnome-shell-42.d.ts" />

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

// Import required modules
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;

// Declare TextEncoder/TextDecoder for TypeScript
declare function log(message: string): void;
declare class TextDecoder {
    constructor(encoding: string);
    decode(data: any): string;
}
declare class TextEncoder {
    encode(text: string): any;
}

export class Reloader {
    private _originalUuid: string;
    private _currentUuid: string;
    private _extensionDir: string;

    /**
     * Create a new Reloader instance
     * @param uuid The extension UUID (e.g., 'my-extension@example.com')
     * @param currentUuid Optional current UUID (used internally for reloaded instances)
     */
    constructor(uuid: string, currentUuid?: string) {
        this._originalUuid = uuid;
        this._currentUuid = currentUuid || uuid;
        this._extensionDir = `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${this._originalUuid}`;
    }

    /**
     * Reload the extension by creating a temporary copy with a new UUID
     */
    reload(): void {
        try {
            log('[Reloader] Starting reload...');

            const extensionManager = (Main as any).extensionManager;

            // Clean up old instances
            this._cleanupOldInstances(extensionManager);

            // Prepare new UUID and directory
            const timestamp = GLib.get_real_time();
            const newUuid = `${this._originalUuid}-reload-${timestamp}`;
            const tmpDir = `/tmp/${newUuid}`;

            // Copy files and update metadata
            const tmpDirFile = this._copyFilesToTemp(tmpDir);
            this._updateMetadata(tmpDirFile, newUuid);

            // Load new extension
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
                    this._cleanupTempDirs(tmpDir);
                    this._unloadOldExtension(extensionManager, this._currentUuid);

                    log('[Reloader] Reload complete!');
                } catch (e: any) {
                    log(`[Reloader] Error during reload: ${e.message}`);
                }

                return GLib.SOURCE_REMOVE;
            });
        } catch (e: any) {
            log(`[Reloader] Failed to reload: ${e.message}`);
        }
    }

    /**
     * Clean up old reload instances
     */
    private _cleanupOldInstances(extensionManager: any): void {
        const allExtensions = extensionManager._extensions;
        for (const [uuid, extension] of Object.entries(allExtensions)) {
            if ((uuid as string).includes('-reload-') && uuid !== this._currentUuid) {
                try {
                    extensionManager.disableExtension(uuid);
                    extensionManager.unloadExtension(extension);
                } catch (e: any) {
                    log(`[Reloader] Error removing ${uuid}: ${e.message}`);
                }
            }
        }
    }

    /**
     * Copy extension files to temporary directory
     */
    private _copyFilesToTemp(tmpDir: string): any {
        GLib.mkdir_with_parents(tmpDir, 0o755);

        const sourceDir = Gio.File.new_for_path(this._extensionDir);
        const tmpDirFile = Gio.File.new_for_path(tmpDir);

        const enumerator = sourceDir.enumerate_children(
            'standard::name,standard::type',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let fileInfo;
        while ((fileInfo = enumerator.next_file(null)) !== null) {
            const name = fileInfo.get_name();
            const sourceFile = sourceDir.get_child(name);
            const destFile = tmpDirFile.get_child(name);
            sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
        }

        return tmpDirFile;
    }

    /**
     * Update metadata.json with new UUID
     */
    private _updateMetadata(tmpDirFile: any, newUuid: string): void {
        const metadataFile = tmpDirFile.get_child('metadata.json');

        if (!metadataFile.query_exists(null)) {
            throw new Error('metadata.json not found');
        }

        const [success, contents] = metadataFile.load_contents(null);
        if (!success) {
            throw new Error('Failed to load metadata.json');
        }

        const metadataText = new TextDecoder('utf-8').decode(contents as any);
        const metadata = JSON.parse(metadataText);
        metadata.uuid = newUuid;

        const newContents = new TextEncoder().encode(JSON.stringify(metadata, null, 2));
        metadataFile.replace_contents(
            newContents as any,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        );
    }

    /**
     * Disable and unload old extension instance
     */
    private _unloadOldExtension(extensionManager: any, uuid: string): void {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            const oldExtension = extensionManager.lookup(uuid);
            if (!oldExtension) {
                return GLib.SOURCE_REMOVE;
            }

            extensionManager.disableExtension(uuid);

            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                try {
                    extensionManager.unloadExtension(oldExtension);
                    log(`[Reloader] Successfully unloaded: ${uuid}`);
                } catch (e: any) {
                    log(`[Reloader] Error unloading: ${e.message}`);
                }
                return GLib.SOURCE_REMOVE;
            });

            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Clean up old temporary directories
     */
    private _cleanupTempDirs(currentTmpDir: string): void {
        const currentTmpName = currentTmpDir.split('/').pop();
        const cleanupCommand = `sh -c "cd /tmp && ls -d ${this._originalUuid}-reload-* 2>/dev/null | grep -v '${currentTmpName}' | xargs rm -rf"`;
        GLib.spawn_command_line_async(cleanupCommand);
    }
}
