import Gio from 'gi://Gio';

import type { MonitorEnvironmentStorage } from '../../domain/monitor/index.js';
import type { MonitorEnvironmentRepository } from '../../operations/monitor/index.js';
import {
  deserializeMonitorEnvironmentStorage,
  type RawMonitorEnvironmentStorage,
  serializeMonitorEnvironmentStorage,
} from './raw-monitor-environment-storage.js';

const log = (message: string): void => console.log(message);

/**
 * File-based implementation of MonitorEnvironmentRepository.
 * Handles reading/writing MonitorEnvironmentStorage to a JSON file.
 */
export class FileMonitorEnvironmentRepository implements MonitorEnvironmentRepository {
  constructor(private readonly filePath: string) {}

  load(): MonitorEnvironmentStorage | null {
    const file = Gio.File.new_for_path(this.filePath);

    if (!file.query_exists(null)) {
      log('[FileMonitorEnvironmentRepository] No storage file found');
      return null;
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (!success) {
        return null;
      }

      const json = new TextDecoder('utf-8').decode(contents);
      const raw = JSON.parse(json) as RawMonitorEnvironmentStorage;
      return deserializeMonitorEnvironmentStorage(raw);
    } catch (e) {
      log(`[FileMonitorEnvironmentRepository] Error loading storage: ${e}`);
      return null;
    }
  }

  save(storage: MonitorEnvironmentStorage): void {
    const file = Gio.File.new_for_path(this.filePath);

    try {
      const parent = file.get_parent();
      if (parent && !parent.query_exists(null)) {
        parent.make_directory_with_parents(null);
      }

      const raw = serializeMonitorEnvironmentStorage(storage);
      const json = JSON.stringify(raw, null, 2);
      file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

      log('[FileMonitorEnvironmentRepository] Storage saved successfully');
    } catch (e) {
      log(`[FileMonitorEnvironmentRepository] Error saving storage: ${e}`);
    }
  }
}
