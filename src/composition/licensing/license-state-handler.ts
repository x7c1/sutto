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
  private stopWatchingNetworkState: (() => void) | null = null;

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

    // Reconnecting ends an exceeded offline grace period, so recompute the
    // cached disabled reason whenever the device comes online.
    this.stopWatchingNetworkState?.();
    this.stopWatchingNetworkState = this.licenseOperations.watchNetworkState(() => {
      this.disabledReason = this.licenseOperations.getDisabledReason();
    });

    this.licenseOperations.initialize().then(() => {
      this.disabledReason = this.licenseOperations.getDisabledReason();
      if (this.disabledReason) {
        log(`[LicenseStateHandler] License invalid on startup: ${this.disabledReason}`);
      }
    });
  }

  /**
   * Record that the user triggered the main panel. When the device is online
   * this records now as the last time it was online. During the trial it also
   * counts today as a usage day (at most once per calendar day) and, when a
   * new day was recorded, warns the user if a pre-expiry threshold was just
   * crossed.
   *
   * Call it before reading getDisabledReason(): recording the day that reaches
   * the limit ends the trial, and the resulting state change updates the
   * disabled reason synchronously.
   */
  recordPanelUse(): void {
    this.licenseOperations.recordOnlineIfConnected();
    if (this.licenseOperations.recordTrialUsage()) {
      this.trialWarningOperations.checkAndNotify();
    }
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
   * Stop following stored license changes and the network state, and remove
   * all state listeners.
   */
  dispose(): void {
    this.stopWatchingStoredChanges?.();
    this.stopWatchingStoredChanges = null;
    this.stopWatchingNetworkState?.();
    this.stopWatchingNetworkState = null;
    this.licenseOperations.clearCallbacks();
  }
}
