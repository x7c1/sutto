import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { DeviceId } from '../../domain/licensing/index.js';
import type { DeviceInfoProvider } from '../../operations/licensing/index.js';

const log = (message: string): void => console.log(message);

/**
 * DeviceInfoProvider implementation reading system files.
 */
export class SystemDeviceInfoProvider implements DeviceInfoProvider {
  getDeviceId(): DeviceId {
    try {
      const file = Gio.File.new_for_path('/etc/machine-id');
      const [success, contents] = file.load_contents(null);
      if (success && contents) {
        const id = new TextDecoder().decode(contents).trim();
        return new DeviceId(id);
      }
    } catch (e) {
      log(`[DeviceInfoProvider] Failed to read machine-id: ${e}`);
    }
    return new DeviceId('unknown-device');
  }

  getDeviceLabel(): string {
    let label = this.getPrettyHostname();

    if (!label) {
      label = GLib.get_host_name() ?? 'Unknown Device';
    }

    return label.substring(0, 64);
  }

  private getPrettyHostname(): string | null {
    try {
      const file = Gio.File.new_for_path('/etc/machine-info');
      const [success, contents] = file.load_contents(null);
      if (success && contents) {
        const text = new TextDecoder().decode(contents);
        const match = text.match(/PRETTY_HOSTNAME=["']?([^"'\n]+)/);
        if (match) {
          return match[1];
        }
      }
    } catch {
      // /etc/machine-info is optional and only present when the user has set a pretty hostname.
      // Fall through to return null, which triggers the GLib.get_host_name() fallback.
    }
    return null;
  }
}
