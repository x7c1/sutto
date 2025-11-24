/**
 * Type definitions for GIO (GNOME Input/Output library)
 * Used in Reloader for file operations
 */

declare namespace Gio {
    /**
     * Cancellable object for async operations
     * Pass null to disable cancellation
     */
    interface Cancellable {
        cancel(): void;
    }
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
         * @param cancellable Optional cancellable object, or null
         */
        query_exists(cancellable: Cancellable | null): boolean;

        /**
         * Loads the entire contents of the file
         * @param cancellable Optional cancellable object, or null
         * @returns [success, contents] tuple
         */
        load_contents(cancellable: Cancellable | null): [boolean, Uint8Array];

        /**
         * Replaces the contents of the file
         * @param cancellable Optional cancellable object, or null
         */
        replace_contents(
            contents: Uint8Array,
            etag: null,
            make_backup: boolean,
            flags: FileCreateFlags,
            cancellable: Cancellable | null
        ): void;

        /**
         * Copies a file
         * @param cancellable Optional cancellable object, or null
         * @param progress_callback Optional progress callback, or null
         */
        copy(
            destination: File,
            flags: FileCopyFlags,
            cancellable: Cancellable | null,
            progress_callback: null
        ): void;

        /**
         * Enumerates children of the directory
         * @param cancellable Optional cancellable object, or null
         */
        enumerate_children(
            attributes: string,
            flags: FileQueryInfoFlags,
            cancellable: Cancellable | null
        ): FileEnumerator;
    }

    /**
     * File enumerator for iterating over directory contents
     */
    interface FileEnumerator {
        /**
         * Gets the next file info
         * @param cancellable Optional cancellable object, or null
         * @returns FileInfo or null if no more files
         */
        next_file(cancellable: Cancellable | null): FileInfo | null;
    }

    /**
     * File information
     */
    interface FileInfo {
        /**
         * Gets the file name
         */
        get_name(): string;

        /**
         * Gets the file type
         */
        get_file_type(): FileType;
    }

    /**
     * File type enumeration
     */
    enum FileType {
        UNKNOWN = 0,
        REGULAR = 1,
        DIRECTORY = 2,
        SYMBOLIC_LINK = 3,
        SPECIAL = 4,
        SHORTCUT = 5,
        MOUNTABLE = 6,
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
