import type { MonitorCountProvider } from './monitor-count-provider.js';
import type { MonitorCountRepository } from './monitor-count-repository.js';
import type { MonitorDetector } from './monitor-detector.js';

/**
 * Usecase for monitor-related operations.
 * Orchestrates file-based storage and system detection.
 */
export class MonitorUsecase implements MonitorCountProvider {
  constructor(
    private readonly monitorCountRepository: MonitorCountRepository,
    private readonly monitorDetector: MonitorDetector
  ) {}

  /**
   * Get the current monitor count.
   * Tries file storage first, falls back to system detection.
   */
  getMonitorCount(): number {
    const fromStorage = this.monitorCountRepository.loadMonitorCount();
    if (fromStorage !== null) {
      return fromStorage;
    }
    return this.monitorDetector.detectMonitorCount();
  }
}
