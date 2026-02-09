/**
 * MonitorChangeHandler
 *
 * Handles monitor detection, environment changes, and collection activation.
 * Coordinates between GnomeShellMonitorProvider, MonitorEnvironmentOperations,
 * and preferences to keep the active collection in sync with the monitor setup.
 */

import { CollectionId } from '../../domain/layout/index.js';
import type { GnomeShellMonitorProvider } from '../../infra/monitor/gnome-shell-monitor-provider.js';
import type { LayoutHistoryRepository } from '../../operations/history/index.js';
import type { MonitorEnvironmentOperations } from '../../operations/monitor/index.js';

declare function log(message: string): void;

export interface MonitorChangeCallbacks {
  getActiveSpaceCollectionId: () => string;
  setActiveSpaceCollectionId: (id: string) => void;
}

export class MonitorChangeHandler {
  constructor(
    private readonly monitorProvider: GnomeShellMonitorProvider,
    private readonly monitorEnvironmentOperations: MonitorEnvironmentOperations,
    private readonly layoutHistoryRepository: LayoutHistoryRepository,
    private readonly callbacks: MonitorChangeCallbacks
  ) {}

  initialize(): void {
    const collectionId = this.parseCollectionIdFromSettings();
    if (collectionId) {
      this.monitorEnvironmentOperations.setActiveCollectionId(collectionId);
    }

    this.detectAndActivate();
  }

  connectToMonitorChanges(onChanged: () => void): void {
    this.monitorProvider.connectToMonitorChanges(() => {
      this.detectAndActivate();
      onChanged();
    });
  }

  private handleMonitorsSaveResult(collectionToActivate: CollectionId | null): void {
    if (collectionToActivate) {
      log(
        `[MonitorChangeHandler] Environment changed, activating collection: ${collectionToActivate.toString()}`
      );
      this.callbacks.setActiveSpaceCollectionId(collectionToActivate.toString());
      this.monitorEnvironmentOperations.setActiveCollectionId(collectionToActivate);
      this.syncActiveCollectionToHistory();
    }
  }

  syncActiveCollectionToHistory(): void {
    const collectionId = this.parseCollectionIdFromSettings();
    if (collectionId) {
      this.layoutHistoryRepository.setActiveCollection(collectionId);
    }
  }

  detectAndActivate(): void {
    this.handleMonitorsSaveResult(this.monitorEnvironmentOperations.detectAndSaveMonitors());
  }

  disconnectMonitorChanges(): void {
    this.monitorProvider.disconnectMonitorChanges();
  }

  private parseCollectionIdFromSettings(): CollectionId | null {
    const str = this.callbacks.getActiveSpaceCollectionId();
    if (!str) return null;
    try {
      return new CollectionId(str);
    } catch {
      return null;
    }
  }
}
