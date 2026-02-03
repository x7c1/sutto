/**
 * Interface for providing monitor count information.
 * Infrastructure layer implements this with file-based or system-based detection.
 */
export interface MonitorCountProvider {
  /**
   * Get the current monitor count.
   * Returns 0 if unable to detect.
   */
  getMonitorCount(): number;
}
