/**
 * Interface for providing monitor count information.
 * MonitorUsecase implements this interface.
 */
export interface MonitorCountProvider {
  /**
   * Get the current monitor count.
   * Returns 0 if unable to detect.
   */
  getMonitorCount(): number;
}
