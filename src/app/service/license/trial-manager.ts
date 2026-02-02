import GLib from 'gi://GLib';
import type { LicenseStorage } from './license-storage.js';

const log = (message: string): void => console.log(message);

const TRIAL_DAYS_LIMIT = 30;

/**
 * Manages trial period tracking
 * Counts actual usage days, not calendar days
 */
export class TrialManager {
  private storage: LicenseStorage;

  constructor(storage: LicenseStorage) {
    this.storage = storage;
  }

  /**
   * Get the number of trial days remaining
   */
  getRemainingDays(): number {
    const used = this.storage.getTrialDaysUsed();
    return Math.max(0, TRIAL_DAYS_LIMIT - used);
  }

  /**
   * Check if the trial period has expired
   */
  isExpired(): boolean {
    return this.getRemainingDays() === 0;
  }

  /**
   * Record a usage day if it's a new day
   * Should be called once per session startup
   * @returns true if a new day was recorded, false if already used today
   */
  recordUsageDay(): boolean {
    const today = this.getTodayDate();
    const lastUsed = this.storage.getTrialLastUsedDate();

    if (lastUsed === today) {
      log(`[TrialManager] Already recorded usage for today (${today})`);
      return false;
    }

    const currentDays = this.storage.getTrialDaysUsed();
    const newDays = currentDays + 1;

    this.storage.setTrialDaysUsed(newDays);
    this.storage.setTrialLastUsedDate(today);

    log(`[TrialManager] Recorded usage day ${newDays}/${TRIAL_DAYS_LIMIT} (${today})`);

    if (newDays >= TRIAL_DAYS_LIMIT) {
      log('[TrialManager] Trial period has ended');
      this.storage.setStatus('expired');
    }

    return true;
  }

  /**
   * Get today's date in ISO 8601 format (YYYY-MM-DD)
   */
  private getTodayDate(): string {
    const now = GLib.DateTime.new_now_local();
    return now.format('%Y-%m-%d') ?? '';
  }

  /**
   * Get the total number of trial days used
   */
  getDaysUsed(): number {
    return this.storage.getTrialDaysUsed();
  }

  /**
   * Reset trial tracking (for testing purposes)
   */
  reset(): void {
    this.storage.setTrialDaysUsed(0);
    this.storage.setTrialLastUsedDate('');
    this.storage.setStatus('trial');
    log('[TrialManager] Trial reset');
  }
}
