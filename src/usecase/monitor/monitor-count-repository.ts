/**
 * Interface for loading monitor count from persistent storage.
 * Infrastructure layer implements this with file-based storage.
 */
export interface MonitorCountRepository {
  /**
   * Load monitor count from storage.
   * Returns null if no data is stored.
   */
  loadMonitorCount(): number | null;
}
