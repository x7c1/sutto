import Gio from 'gi://Gio';
import type { NetworkState } from '../../domain/licensing/index.js';
import type { NetworkStateProvider } from '../../operations/licensing/index.js';

declare function log(message: string): void;

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

  /**
   * Follow Gio.NetworkMonitor's `network-changed` signal.
   */
  watchNetworkState(callback: (state: NetworkState) => void): () => void {
    let monitor: Gio.NetworkMonitor;
    try {
      monitor = Gio.NetworkMonitor.get_default();
    } catch (e) {
      log(`[GioNetworkStateProvider] Network monitor unavailable: ${e}`);
      return () => {};
    }

    const signalId = monitor.connect('network-changed', (_monitor, available: boolean) => {
      try {
        callback(available ? 'online' : 'offline');
      } catch (e) {
        log(`[GioNetworkStateProvider] Network change callback error: ${e}`);
      }
    });

    return () => {
      monitor.disconnect(signalId);
    };
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
