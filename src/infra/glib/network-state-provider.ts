import Gio from 'gi://Gio';
import type { NetworkState } from '../../domain/licensing/index.js';
import type { NetworkStateProvider } from '../../operations/licensing/index.js';

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

function isNetworkAvailable(): boolean {
  try {
    const monitor = Gio.NetworkMonitor.get_default();
    return monitor.get_network_available();
  } catch {
    return true;
  }
}
