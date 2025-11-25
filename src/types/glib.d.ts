/**
 * Type definitions for GLib (GNOME Library)
 * Core utility functions and types
 */

declare namespace GLib {
    /**
     * Variant type - GLib's generic value container
     */
    // biome-ignore lint/complexity/noStaticOnlyClass: GLib.Variant is the actual GJS API
    class Variant {
        /**
         * Creates a new Variant
         * @param format_string Format string (e.g., '(b)' for tuple with boolean)
         * @param value Value to wrap
         */
        // biome-ignore lint/suspicious/noMisleadingInstantiator: This matches GLib's actual API
        static new(format_string: string, value: any): Variant;
    }

    /**
     * Gets the current real time in microseconds
     */
    function get_real_time(): number;

    /**
     * Gets the user's home directory
     */
    function get_home_dir(): string;

    /**
     * Creates a directory with parents
     */
    function mkdir_with_parents(pathname: string, mode: number): number;

    /**
     * Spawns a command asynchronously
     */
    function spawn_command_line_async(command_line: string): boolean;

    /**
     * Adds a timeout callback
     */
    function timeout_add(priority: number, interval: number, callback: () => boolean): number;

    /**
     * Priority constants
     */
    const PRIORITY_DEFAULT: number;

    /**
     * Source return values
     */
    const SOURCE_REMOVE: boolean;
}

declare const GLib: typeof GLib;
