/**
 * Interface for detecting monitor count from the system.
 * Infrastructure layer implements this with platform-specific detection (e.g., Gdk).
 */
export interface MonitorDetector {
  /**
   * Detect monitor count from the system.
   * Returns 0 if unable to detect.
   */
  detectMonitorCount(): number;
}
