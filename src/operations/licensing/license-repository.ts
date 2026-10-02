import type {
  License,
  LicenseStatus,
  TrialPeriod,
  TrialProbeResult,
} from '../../domain/licensing/index.js';

/**
 * Interface for license data persistence
 * Infrastructure layer implements this interface with GSettings
 */
export interface LicenseRepository {
  /**
   * Load license data from storage
   * Returns null if no license is stored
   */
  loadLicense(): License | null;

  /**
   * Save license data to storage
   */
  saveLicense(license: License): void;

  /**
   * Load trial data from storage
   */
  loadTrialPeriod(): TrialPeriod;

  /**
   * Save trial data to storage
   */
  saveTrialPeriod(trial: TrialPeriod): void;

  /**
   * Get the trial pre-expiry warning threshold (in remaining days) that has
   * already been warned about. Returns NO_TRIAL_WARNING when none has.
   */
  getTrialWarningThreshold(): number;

  /**
   * Store the trial pre-expiry warning threshold that has been warned about.
   */
  setTrialWarningThreshold(threshold: number): void;

  /**
   * Get the last time the device was seen online.
   * Returns null when none is recorded (or the stored value is not usable).
   */
  getLastOnlineAt(): Date | null;

  /**
   * Store the last time the device was seen online.
   * This is not a license change: it is not reported to watchChanges().
   */
  setLastOnlineAt(date: Date): void;

  /**
   * Get the result of the last time the license server was asked, after the
   * Trial Period ended, whether it is there. Returns 'none' when it has not
   * been asked (or the stored value is not usable).
   */
  getTrialProbeResult(): TrialProbeResult;

  /**
   * Store the result of asking the license server whether it is there.
   */
  setTrialProbeResult(result: TrialProbeResult): void;

  /**
   * Get the current license status
   */
  getStatus(): LicenseStatus;

  /**
   * Set the license status
   */
  setStatus(status: LicenseStatus): void;

  /**
   * Watch for changes to the stored license or trial data, including writes
   * made by another process (e.g. the preferences window).
   * Implementations may coalesce a burst of writes into a single callback.
   * @returns A function that stops watching
   */
  watchChanges(callback: () => void): () => void;
}
