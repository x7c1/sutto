/**
 * LicenseStateHandler
 *
 * Manages license initialization, state tracking, and validity checks.
 * Wraps LicenseOperations so the Controller can ask why the extension is
 * disabled without recomputing the reason itself.
 */

import type { DisabledReason, LicenseState } from '../../domain/licensing/index.js';
import type {
  LicenseOperations,
  TrialWarningOperations,
} from '../../operations/licensing/index.js';

declare function log(message: string): void;

export class LicenseStateHandler {
  private disabledReason: DisabledReason | null = null;
  private stopWatchingStoredChanges: (() => void) | null = null;

  constructor(
    private readonly licenseOperations: LicenseOperations,
    private readonly trialWarningOperations: TrialWarningOperations
  ) {}

  initialize(onBecameInvalid: (reason: DisabledReason) => void): void {
    this.licenseOperations.onStateChange(() => {
      this.disabledReason = this.licenseOperations.getDisabledReason();
      if (this.disabledReason) {
        log(`[LicenseStateHandler] License invalid (${this.disabledReason}), notifying controller`);
        onBecameInvalid(this.disabledReason);
      }
    });

    // The preferences window runs in its own process and writes license
    // changes straight to storage; follow them so activating a license there
    // unlocks the panel without reloading the extension.
    this.stopWatchingStoredChanges?.();
    this.stopWatchingStoredChanges = this.licenseOperations.watchStoredChanges();

    this.licenseOperations.initialize().then(() => {
      this.disabledReason = this.licenseOperations.getDisabledReason();
      if (this.disabledReason) {
        log(`[LicenseStateHandler] License invalid on startup: ${this.disabledReason}`);
      }
      // The trial day count only advances at startup, so the pre-expiry
      // thresholds can only be crossed here.
      this.trialWarningOperations.checkAndNotify();
    });
  }

  /**
   * Why the extension is currently disabled, or null when it is enabled.
   */
  getDisabledReason(): DisabledReason | null {
    return this.disabledReason;
  }

  /**
   * The current license state, read fresh from the repository.
   */
  getLicenseState(): LicenseState {
    return this.licenseOperations.getState();
  }

  /**
   * Register an additional listener for license state changes.
   * Listeners are removed by dispose().
   */
  onStateChange(listener: (state: LicenseState) => void): void {
    this.licenseOperations.onStateChange(listener);
  }

  /**
   * Stop following stored license changes and remove all state listeners.
   */
  dispose(): void {
    this.stopWatchingStoredChanges?.();
    this.stopWatchingStoredChanges = null;
    this.licenseOperations.clearCallbacks();
  }
}
