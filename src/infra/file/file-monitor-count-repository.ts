import Gio from 'gi://Gio';

import type { MonitorCountRepository } from '../../operations/monitor/monitor-count-repository.js';

const log = (message: string): void => console.log(message);

/**
 * File-based implementation of MonitorCountRepository.
 * Reads monitor count from a JSON file.
 */
export class FileMonitorCountRepository implements MonitorCountRepository {
  constructor(private readonly filePath: string) {}

  loadMonitorCount(): number | null {
    const file = Gio.File.new_for_path(this.filePath);

    if (!file.query_exists(null)) {
      return null;
    }

    try {
      const [success, contents] = file.load_contents(null);
      if (!success) {
        return null;
      }

      const contentsString = new TextDecoder('utf-8').decode(contents);
      const data = JSON.parse(contentsString);
      const currentEnv = data.environments.find(
        (e: { id: string; monitors: unknown[] }) => e.id === data.current
      );
      if (currentEnv && Array.isArray(currentEnv.monitors)) {
        return currentEnv.monitors.length;
      }
      return null;
    } catch (e) {
      log(`[FileMonitorCountRepository] Error loading monitor count: ${e}`);
      return null;
    }
  }
}
