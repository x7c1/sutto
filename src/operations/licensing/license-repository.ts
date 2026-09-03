import type { License, LicenseStatus, TrialPeriod } from '../../domain/licensing/index.js';

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
   * Get the current license status
   */
  getStatus(): LicenseStatus;

  /**
   * Set the license status
   */
  setStatus(status: LicenseStatus): void;

  /**
   * Clear all license data (return to trial mode)
   */
  clearLicense(): void;
}
