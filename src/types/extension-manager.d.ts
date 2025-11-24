/**
 * Type definitions for GNOME Shell Extension Manager
 * Based on GNOME Shell 42 API
 */

/**
 * Extension object representing a loaded extension
 */
interface Extension {
    uuid: string;
    dir: Gio.File;
    path: string;
    metadata: ExtensionMetadata;
    state: ExtensionState;
    type: ExtensionType;
}

/**
 * Extension metadata from metadata.json
 */
interface ExtensionMetadata {
    uuid: string;
    name: string;
    description: string;
    'shell-version': string[];
    url?: string;
    version?: number;
}

/**
 * Extension state enum
 */
declare enum ExtensionState {
    ENABLED = 1,
    DISABLED = 2,
    ERROR = 3,
    OUT_OF_DATE = 4,
    DOWNLOADING = 5,
    INITIALIZED = 6,
    DISABLING = 7,
    ENABLING = 8,
}

/**
 * Extension type enum
 */
declare enum ExtensionType {
    SYSTEM = 0,
    PER_USER = 1,
}

/**
 * Extension Manager for loading/unloading extensions
 */
interface ExtensionManager {
    /**
     * Map of all loaded extensions by UUID
     */
    _extensions: Record<string, Extension>;

    /**
     * Create an extension object from a directory
     */
    createExtensionObject(uuid: string, dir: Gio.File, type: ExtensionType): Extension;

    /**
     * Load an extension
     */
    loadExtension(extension: Extension): boolean;

    /**
     * Enable an extension by UUID
     */
    enableExtension(uuid: string): boolean;

    /**
     * Disable an extension by UUID
     */
    disableExtension(uuid: string): boolean;

    /**
     * Unload an extension
     */
    unloadExtension(extension: Extension): boolean;

    /**
     * Look up an extension by UUID
     */
    lookup(uuid: string): Extension | null;
}

/**
 * Main module interface
 */
interface Main {
    extensionManager: ExtensionManager;
}
