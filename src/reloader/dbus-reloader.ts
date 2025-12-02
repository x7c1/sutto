/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * D-Bus Reloader Interface
 *
 * Provides a D-Bus interface for reloading GNOME Shell extensions from the command line.
 *
 * Usage from command line:
 *   gdbus call --session \
 *     --dest org.gnome.Shell \
 *     --object-path /io/github/x7c1/Snappa \
 *     --method io.github.x7c1.Snappa.Reload
 */

import { Reloader } from './reloader';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

// Declare log function for TypeScript
declare function log(message: string): void;

// D-Bus interface XML definition
const DBUS_INTERFACE_XML = `
<node>
  <interface name="io.github.x7c1.Snappa">
    <method name="Reload">
      <arg type="b" direction="out" name="success"/>
    </method>
  </interface>
</node>
`;

export class DBusReloader {
  private reloader: Reloader;
  private dbusId: number | null;

  /**
   * Create a new DBusReloader instance
   * @param originalUuid The extension's original UUID
   * @param currentUuid The current UUID (for reloaded instances)
   */
  constructor(originalUuid: string, currentUuid?: string) {
    this.reloader = new Reloader(originalUuid, currentUuid);
    this.dbusId = null;
  }

  /**
   * Register the D-Bus interface
   */
  enable(): void {
    try {
      log('[DBusReloader] Starting D-Bus registration...');

      // Get the session bus connection
      const connection = Gio.bus_get_sync(Gio.BusType.SESSION, null);
      log('[DBusReloader] Got session bus connection');

      // Parse the XML interface definition
      const nodeInfo = Gio.DBusNodeInfo.new_for_xml(DBUS_INTERFACE_XML);
      log('[DBusReloader] Parsed XML interface definition');

      const interfaceInfo = nodeInfo.lookup_interface('io.github.x7c1.Snappa');
      log('[DBusReloader] Looked up interface info');

      // Register the D-Bus object
      this.dbusId = connection.register_object(
        '/io/github/x7c1/Snappa',
        interfaceInfo,
        (
          _connection: any,
          _sender: string,
          _object_path: string,
          _interface_name: string,
          method_name: string,
          _parameters: any,
          invocation: any
        ) => {
          log(`[DBusReloader] Method called: ${method_name}`);
          if (method_name === 'Reload') {
            this.handleReload(invocation);
          }
        },
        null, // get_property
        null // set_property
      );

      log(
        `[DBusReloader] D-Bus interface registered at /io/github/x7c1/Snappa with ID: ${this.dbusId}`
      );
    } catch (e: unknown) {
      log(`[DBusReloader] Failed to register D-Bus interface: ${this.getErrorMessage(e)}`);
    }
  }

  /**
   * Unregister the D-Bus interface
   */
  disable(): void {
    if (this.dbusId !== null) {
      try {
        const connection = Gio.bus_get_sync(Gio.BusType.SESSION, null);
        connection.unregister_object(this.dbusId);
        this.dbusId = null;
        log('[DBusReloader] D-Bus interface unregistered');
      } catch (e: unknown) {
        log(`[DBusReloader] Failed to unregister: ${this.getErrorMessage(e)}`);
      }
    }
  }

  /**
   * Handle the Reload D-Bus method call
   */
  private handleReload(invocation: Gio.DBusMethodInvocation): void {
    try {
      log('[DBusReloader] Reload method called via D-Bus');
      this.reloader.reload();

      // Return success
      invocation.return_value(GLib.Variant.new('(b)', [true]));
    } catch (e: unknown) {
      log(`[DBusReloader] Reload failed: ${this.getErrorMessage(e)}`);

      // Return error
      invocation.return_error_literal(0, 1, `Reload failed: ${this.getErrorMessage(e)}`);
    }
  }

  /**
   * Type guard to safely extract error message
   */
  private getErrorMessage(e: unknown): string {
    if (e instanceof Error) {
      return e.message;
    }
    return String(e);
  }
}
