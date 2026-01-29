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
     * Gets the file path as a string
     */
    get_path(): string;

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
     * Creates a directory with parent directories
     * @param cancellable Optional cancellable object, or null
     */
    make_directory_with_parents(cancellable: Cancellable | null): void;

    /**
     * Opens file for appending
     * @param flags Flags for file creation
     * @param cancellable Optional cancellable object, or null
     */
    append_to(flags: FileCreateFlags, cancellable: Cancellable | null): FileOutputStream;

    /**
     * Gets the parent directory
     */
    get_parent(): File | null;

    /**
     * Moves a file
     * @param destination Destination file
     * @param flags Copy flags
     * @param cancellable Optional cancellable object, or null
     * @param progress_callback Optional progress callback, or null
     */
    move(
      destination: File,
      flags: FileCopyFlags,
      cancellable: Cancellable | null,
      progress_callback: null
    ): void;

    /**
     * Deletes the file
     * @param cancellable Optional cancellable object, or null
     */
    delete(cancellable: Cancellable | null): void;

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
   * File output stream for writing to files
   */
  interface FileOutputStream {
    /**
     * Writes all bytes from the buffer
     * @param buffer Bytes to write
     * @param cancellable Optional cancellable object, or null
     * @returns [success, bytes_written] tuple
     */
    write_all(buffer: Uint8Array, cancellable: Cancellable | null): [boolean, number];

    /**
     * Closes the stream
     * @param cancellable Optional cancellable object, or null
     */
    close(cancellable: Cancellable | null): void;
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
    NONE = 0,
    REPLACE_DESTINATION = 4,
  }

  /**
   * Creates a File object for the given path
   */
  function new_for_path(path: string): File;

  /**
   * D-Bus connection interface
   */
  interface DBusConnection {
    register_object(
      object_path: string,
      interface_info: DBusInterfaceInfo,
      vtable: DBusInterfaceVTable
    ): number;

    unregister_object(registration_id: number): void;
  }

  /**
   * D-Bus interface info
   */
  interface DBusInterfaceInfo {
    name: string;
    methods: DBusMethodInfo[];
    signals: DBusSignalInfo[];
    properties: DBusPropertyInfo[];
  }

  /**
   * D-Bus method info
   */
  interface DBusMethodInfo {
    name: string;
    in_args: DBusArgInfo[];
    out_args: DBusArgInfo[];
  }

  /**
   * D-Bus signal info
   */
  interface DBusSignalInfo {
    name: string;
    args: DBusArgInfo[];
  }

  /**
   * D-Bus property info
   */
  interface DBusPropertyInfo {
    name: string;
    signature: string;
    flags: number;
  }

  /**
   * D-Bus argument info
   */
  interface DBusArgInfo {
    name: string;
    signature: string;
  }

  /**
   * D-Bus interface virtual table
   */
  interface DBusInterfaceVTable {
    method_call?: (
      connection: DBusConnection,
      sender: string,
      object_path: string,
      interface_name: string,
      method_name: string,
      parameters: any,
      invocation: DBusMethodInvocation
    ) => void;
    get_property?: (
      connection: DBusConnection,
      sender: string,
      object_path: string,
      interface_name: string,
      property_name: string
    ) => any;
    set_property?: (
      connection: DBusConnection,
      sender: string,
      object_path: string,
      interface_name: string,
      property_name: string,
      value: any
    ) => boolean;
  }

  /**
   * D-Bus method invocation
   */
  interface DBusMethodInvocation {
    return_value(parameters: any | null): void;
    return_error_literal(domain: number, code: number, message: string): void;
  }

  /**
   * D-Bus bus types
   */
  enum BusType {
    SESSION = 1,
    SYSTEM = 2,
  }

  /**
   * Gets the session bus connection
   */
  const DBus: {
    session: DBusConnection;
    system: DBusConnection;
  };

  /**
   * Node info for D-Bus introspection XML
   */
  interface DBusNodeInfo {
    lookup_interface(name: string): DBusInterfaceInfo;
  }

  /**
   * Creates a DBusNodeInfo from XML
   */
  function DBusNodeInfo_new_for_xml(xml_data: string): DBusNodeInfo;

  /**
   * Gets a D-Bus connection synchronously
   */
  function bus_get_sync(bus_type: BusType, cancellable: Cancellable | null): DBusConnection;

  /**
   * GSettings schema source for loading schemas
   */
  interface SettingsSchemaSource {
    lookup(schema_id: string, recursive: boolean): SettingsSchema | null;
  }

  /**
   * GSettings schema
   */
  interface SettingsSchema {
    get_id(): string;
  }

  /**
   * GSettings interface for application settings
   */
  interface Settings {
    get_strv(key: string): string[];
    set_strv(key: string, value: string[]): boolean;
    get_string(key: string): string;
    set_string(key: string, value: string): boolean;
    get_boolean(key: string): boolean;
    set_boolean(key: string, value: boolean): boolean;
    get_int(key: string): number;
    set_int(key: string, value: number): boolean;
  }

  interface SettingsConstructor {
    new (properties: { settings_schema: SettingsSchema }): Settings;
  }

  const Settings: SettingsConstructor;

  interface SettingsSchemaSourceConstructor {
    new_from_directory(
      directory: string,
      parent: SettingsSchemaSource | null,
      trusted: boolean
    ): SettingsSchemaSource;
    get_default(): SettingsSchemaSource;
  }

  const SettingsSchemaSource: SettingsSchemaSourceConstructor;

  /**
   * Subprocess flags
   */
  enum SubprocessFlags {
    NONE = 0,
    STDIN_PIPE = 1,
    STDIN_INHERIT = 2,
    STDOUT_PIPE = 4,
    STDOUT_SILENCE = 8,
    STDERR_PIPE = 16,
    STDERR_SILENCE = 32,
    STDERR_MERGE = 64,
    INHERIT_FDS = 128,
  }

  /**
   * Subprocess interface for running external commands
   */
  interface Subprocess {
    wait_async(cancellable: Cancellable | null, callback: (result: any) => void): void;
    get_successful(): boolean;
  }

  interface SubprocessConstructor {
    new (argv: string[], flags: SubprocessFlags): Subprocess;
  }

  const Subprocess: SubprocessConstructor;
}

declare const Gio: typeof Gio;
