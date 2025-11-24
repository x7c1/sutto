/**
 * Type definitions for GIO (GNOME Input/Output library)
 * Used in Reloader for file operations
 */

declare namespace Gio {
    /**
     * File interface for file and directory operations
     */
    interface File {
        /**
         * Gets a child file with the given name
         */
        get_child(name: string): File;

        /**
         * Checks if the file exists
         */
        query_exists(cancellable: null): boolean;

        /**
         * Loads the entire contents of the file
         * @returns [success, contents] tuple
         */
        load_contents(cancellable: null): [boolean, Uint8Array];

        /**
         * Replaces the contents of the file
         */
        replace_contents(
            contents: Uint8Array,
            etag: null,
            make_backup: boolean,
            flags: FileCreateFlags,
            cancellable: null
        ): void;

        /**
         * Copies a file
         */
        copy(
            destination: File,
            flags: FileCopyFlags,
            cancellable: null,
            progress_callback: null
        ): void;

        /**
         * Enumerates children of the directory
         */
        enumerate_children(
            attributes: string,
            flags: FileQueryInfoFlags,
            cancellable: null
        ): FileEnumerator;
    }

    /**
     * File enumerator for iterating over directory contents
     */
    interface FileEnumerator {
        /**
         * Gets the next file info
         * @returns FileInfo or null if no more files
         */
        next_file(cancellable: null): FileInfo | null;
    }

    /**
     * File information
     */
    interface FileInfo {
        /**
         * Gets the file name
         */
        get_name(): string;
    }

    /**
     * Flags for file queries
     */
    enum FileQueryInfoFlags {
        NONE = 0,
    }

    /**
     * Flags for file copy operations
     */
    enum FileCopyFlags {
        OVERWRITE = 1,
    }

    /**
     * Flags for file creation
     */
    enum FileCreateFlags {
        REPLACE_DESTINATION = 4,
    }

    /**
     * Creates a File object for the given path
     */
    function new_for_path(path: string): File;
}

declare const Gio: typeof Gio;
