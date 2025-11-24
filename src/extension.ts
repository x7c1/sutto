/// <reference path="./types/gnome-shell-42.d.ts" />

// Declare global GJS functions
declare function log(message: string): void;
declare class TextDecoder {
    constructor(encoding: string);
    decode(data: any): string;
}
declare class TextEncoder {
    encode(text: string): any;
}

// Import GJS modules
const St = imports.gi.St;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// Type definitions for GJS extension API
interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    'shell-version': string[];
    url: string;
    version: number;
}

// Extension class with typed properties and methods
class Extension {
    private _indicator: any; // St.Button
    private _uuid: string;
    private _originalUuid: string = 'snappa@x7c1.github.io';
    private _dir: string;

    constructor(metadata: ExtensionMetadata) {
        this._indicator = null;
        this._uuid = metadata.uuid;
        // Always use the original UUID directory for reloading
        // This ensures we can reload multiple times without issues
        this._dir = `${GLib.get_home_dir()}/.local/share/gnome-shell/extensions/${this._originalUuid}`;
    }

    /**
     * Reload this extension by creating a temporary copy with a different UUID
     */
    private _reloadExtension(): void {
        try {
            log('[Snappa] Starting reload...');

            const extensionManager = (Main as any).extensionManager;

            // First, disable and unload all previous reload instances (except current one)
            log('[Snappa] Cleaning up old reload instances...');
            const allExtensions = extensionManager._extensions;
            for (const [uuid, extension] of Object.entries(allExtensions)) {
                // Skip current instance - we'll handle it separately later
                if ((uuid as string).includes('-reload-') && uuid !== this._uuid) {
                    log(`[Snappa] Removing old instance: ${uuid}`);
                    try {
                        extensionManager.disableExtension(uuid);
                        extensionManager.unloadExtension(extension);
                    } catch (e: any) {
                        log(`[Snappa] Error removing ${uuid}: ${e.message}`);
                    }
                }
            }

            const timestamp = GLib.get_real_time();
            const newUuid = `${this._originalUuid}-reload-${timestamp}`;
            const tmpDir = `/tmp/${newUuid}`;
            const currentUuid = this._uuid; // Capture current UUID for closure

            log(`[Snappa] Current UUID: ${currentUuid}`);
            log(`[Snappa] Creating temporary directory: ${tmpDir}`);

            // Create temporary directory
            GLib.mkdir_with_parents(tmpDir, 0o755);

            // Copy all files from extension directory to tmp
            const dir = Gio.File.new_for_path(this._dir);
            const tmpDirFile = Gio.File.new_for_path(tmpDir);

            const enumerator = dir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            log('[Snappa] Copying files...');
            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                const name = fileInfo.get_name();
                const sourceFile = dir.get_child(name);
                const destFile = tmpDirFile.get_child(name);
                sourceFile.copy(destFile, Gio.FileCopyFlags.OVERWRITE, null, null);
            }

            // Modify metadata.json to use new UUID
            log('[Snappa] Modifying metadata.json...');
            const metadataFile = tmpDirFile.get_child('metadata.json');

            // Check if metadata.json exists
            if (!metadataFile.query_exists(null)) {
                log(`[Snappa] ERROR: metadata.json not found at ${metadataFile.get_path()}`);
                return;
            }

            const [success, contents] = metadataFile.load_contents(null);
            if (success) {
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
                log(`[Snappa] metadata.json updated with UUID: ${newUuid}`);
            }

            // Verify files were copied
            log(`[Snappa] Verifying copied files in ${tmpDir}:`);
            const verifyEnum = tmpDirFile.enumerate_children(
                'standard::name',
                Gio.FileQueryInfoFlags.NONE,
                null
            );
            let verifyInfo;
            while ((verifyInfo = verifyEnum.next_file(null)) !== null) {
                log(`  - ${verifyInfo.get_name()}`);
            }

            // Load new extension with temporary UUID FIRST (before disabling current one)
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                try {
                    log(`[Snappa] Loading new extension with UUID: ${newUuid}`);

                    // Create extension object from the tmp directory
                    const newExtensionPath = tmpDirFile.get_path();
                    const newExtension = extensionManager.createExtensionObject(
                        newUuid,
                        Gio.File.new_for_path(newExtensionPath),
                        1 // ExtensionType.PER_USER
                    );

                    log('[Snappa] Loading extension...');
                    extensionManager.loadExtension(newExtension);

                    log('[Snappa] Enabling extension...');
                    extensionManager.enableExtension(newUuid);

                    log('[Snappa] New extension enabled, now cleaning up old ones...');

                    // Clean up old temporary directories (but keep the current one until after we disable the old extension)
                    const currentTmpName = tmpDir.split('/').pop();
                    GLib.spawn_command_line_async(`sh -c "cd /tmp && ls -d snappa@x7c1.github.io-reload-* 2>/dev/null | grep -v '${currentTmpName}' | xargs rm -rf"`);

                    log('[Snappa] Now disabling old extension...');

                    // Now disable the old extension (after new one is already showing)
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                        log(`[Snappa] Attempting to disable old extension: ${currentUuid}`);

                        try {
                            // Try using lookup() method instead of direct access
                            const oldExtension = extensionManager.lookup(currentUuid);
                            if (oldExtension) {
                                log(`[Snappa] Found old extension via lookup(), state: ${oldExtension.state}`);
                                log(`[Snappa] Disabling...`);
                                extensionManager.disableExtension(currentUuid);

                                // Give it a moment, then unload
                                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                                    try {
                                        log(`[Snappa] Unloading...`);
                                        extensionManager.unloadExtension(oldExtension);
                                        log(`[Snappa] Successfully unloaded: ${currentUuid}`);
                                    } catch (unloadE: any) {
                                        log(`[Snappa] Error unloading: ${unloadE.message}`);
                                    }
                                    return GLib.SOURCE_REMOVE;
                                });
                            } else {
                                log(`[Snappa] Old extension ${currentUuid} not found via lookup()`);
                            }
                        } catch (e: any) {
                            log(`[Snappa] Error disabling old extension: ${e.message}`);
                        }
                        return GLib.SOURCE_REMOVE;
                    });

                    log('[Snappa] Reload complete!');

                } catch (innerE: any) {
                    log(`[Snappa] Error during reload: ${innerE.message}\n${innerE.stack}`);
                }

                return GLib.SOURCE_REMOVE;
            });

        } catch (e: any) {
            log(`[Snappa] Failed to reload extension: ${e.message}\n${e.stack || ''}`);
        }
    }

    /**
     * Enable the extension - called when extension is activated
     */
    enable(): void {
        // Create a button instead of label
        this._indicator = new (St as any).Button({
            style_class: 'panel-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        const label = new St.Label({
            text: 'Reload',
            y_align: 2, // CENTER
        });
        this._indicator.set_child(label);

        // Connect click event to reload function
        this._indicator.connect('button-press-event', () => {
            this._reloadExtension();
            return true; // Clutter.EVENT_STOP
        });

        // Add the button to the panel (top bar)
        Main.panel._rightBox.insert_child_at_index(this._indicator, 0);
    }

    /**
     * Disable the extension - called when extension is deactivated
     */
    disable(): void {
        // Remove the label from the panel
        if (this._indicator) {
            Main.panel._rightBox.remove_child(this._indicator);
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}

/**
 * Initialize the extension
 * This function is called when the extension is loaded
 */
function init(metadata: ExtensionMetadata): Extension {
    return new Extension(metadata);
}
