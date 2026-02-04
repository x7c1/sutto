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
