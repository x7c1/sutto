import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { DeviceId, type NetworkState } from '../../domain/licensing/index.js';
import type {
  DateProvider,
  DeviceInfoProvider,
  NetworkStateProvider,
} from '../../usecase/licensing/index.js';

const log = (message: string): void => console.log(message);

/**
 * Check if network is available using NetworkManager via Gio
 */
function isNetworkAvailable(): boolean {
  try {
    const monitor = Gio.NetworkMonitor.get_default();
    return monitor.get_network_available();
  } catch {
    return true;
  }
}

/**
 * GLib-based DateProvider implementation.
 */
export class GLibDateProvider implements DateProvider {
  now(): Date {
    return new Date();
  }

  today(): string {
    const now = GLib.DateTime.new_now_local();
    return now.format('%Y-%m-%d') ?? '';
  }
}

/**
 * NetworkStateProvider implementation using Gio.NetworkMonitor.
 */
export class GioNetworkStateProvider implements NetworkStateProvider {
  getNetworkState(): NetworkState {
    if (!isNetworkAvailable()) {
      return 'offline';
    }
    return 'online';
  }
}

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
      // machine-info may not exist
    }
    return null;
  }
}
