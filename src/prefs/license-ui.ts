import Adw from 'gi://Adw';
import type Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {
  LicenseClient,
  LicenseManager,
  type LicenseState,
  LicenseStorage,
  TrialManager,
} from '../app/facade/license/index.js';

/**
 * Create the License preferences group
 */
export function createLicenseGroup(
  window: Adw.PreferencesWindow,
  settings: Gio.Settings
): Adw.PreferencesGroup {
  const group = new Adw.PreferencesGroup({
    title: 'License',
  });

  const storage = new LicenseStorage(settings);
  const client = new LicenseClient(__LICENSE_API_BASE_URL__);
  const trialManager = new TrialManager(storage);
  const licenseManager = new LicenseManager(storage, client, trialManager);

  const statusRow = createStatusRow(licenseManager.getState());
  group.add(statusRow);

  const { row: keyRow } = createLicenseKeyRow(licenseManager, () =>
    updateStatusRow(statusRow, licenseManager.getState())
  );
  group.add(keyRow);

  licenseManager.onStateChange((state) => {
    updateStatusRow(statusRow, state);
  });

  window.connect('close-request', () => {
    licenseManager.destroy();
    return false;
  });

  return group;
}

function createStatusRow(state: LicenseState): Adw.ActionRow {
  const row = new Adw.ActionRow();
  updateStatusRow(row, state);
  return row;
}

function updateStatusRow(row: Adw.ActionRow, state: LicenseState): void {
  const { title, subtitle, showPurchaseLink } = getStatusDisplay(state);

  row.set_title(title);
  row.set_subtitle(subtitle);

  // Remove existing suffix widgets
  let child = row.get_first_child();
  while (child) {
    const next = child.get_next_sibling();
    if (child instanceof Gtk.Button) {
      row.remove(child);
    }
    child = next;
  }

  if (showPurchaseLink) {
    const purchaseButton = new Gtk.Button({
      label: 'Purchase License',
      valign: Gtk.Align.CENTER,
    });
    purchaseButton.add_css_class('suggested-action');
    purchaseButton.connect('clicked', () => {
      Gtk.show_uri(null, __LICENSE_PURCHASE_URL__, 0);
    });
    row.add_suffix(purchaseButton);
  }
}

interface StatusDisplay {
  title: string;
  subtitle: string;
  showPurchaseLink: boolean;
}

function getStatusDisplay(state: LicenseState): StatusDisplay {
  const { status, networkState, trialDaysRemaining, validUntil, daysSinceLastValidation } = state;

  if (status === 'trial') {
    if (networkState === 'backend_unreachable') {
      return {
        title: 'Trial',
        subtitle: 'Server unavailable',
        showPurchaseLink: true,
      };
    }
    return {
      title: 'Trial',
      subtitle: `${trialDaysRemaining} days remaining`,
      showPurchaseLink: true,
    };
  }

  if (status === 'valid') {
    if (networkState === 'offline') {
      const daysUntilRequired = Math.ceil(7 - daysSinceLastValidation);
      return {
        title: 'Active',
        subtitle: `Offline - connect within ${daysUntilRequired} days`,
        showPurchaseLink: false,
      };
    }
    if (networkState === 'backend_unreachable') {
      return {
        title: 'Active',
        subtitle: 'Server unavailable',
        showPurchaseLink: false,
      };
    }
    const validUntilStr = validUntil ? formatDate(validUntil) : 'Unknown';
    return {
      title: 'Active',
      subtitle: `Valid until ${validUntilStr}`,
      showPurchaseLink: false,
    };
  }

  if (status === 'expired') {
    if (trialDaysRemaining === 0) {
      return {
        title: 'Trial Expired',
        subtitle: 'Please purchase a license',
        showPurchaseLink: true,
      };
    }
    return {
      title: 'Expired',
      subtitle: 'Please renew your subscription',
      showPurchaseLink: true,
    };
  }

  // status === 'invalid'
  return {
    title: 'Invalid',
    subtitle: state.errorMessage ?? 'License key is invalid',
    showPurchaseLink: true,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface LicenseKeyRowResult {
  row: Adw.EntryRow;
  activateButton: Gtk.Button;
}

function createLicenseKeyRow(
  licenseManager: LicenseManager,
  onUpdate: () => void
): LicenseKeyRowResult {
  const row = new Adw.EntryRow({
    title: 'License Key',
  });

  const spinner = new Gtk.Spinner({
    valign: Gtk.Align.CENTER,
  });

  const activateButton = new Gtk.Button({
    label: 'Activate',
    valign: Gtk.Align.CENTER,
  });
  activateButton.add_css_class('suggested-action');

  const buttonBox = new Gtk.Box({
    spacing: 6,
    valign: Gtk.Align.CENTER,
  });
  buttonBox.append(spinner);
  buttonBox.append(activateButton);

  row.add_suffix(buttonBox);

  const setLoading = (loading: boolean) => {
    spinner.set_visible(loading);
    if (loading) {
      spinner.start();
    } else {
      spinner.stop();
    }
    activateButton.set_sensitive(!loading);
    row.set_sensitive(!loading);
  };

  activateButton.connect('clicked', async () => {
    const licenseKey = row.get_text().trim();
    if (!licenseKey) {
      return;
    }

    setLoading(true);

    try {
      const result = await licenseManager.activate(licenseKey);

      if (result.success) {
        row.set_text('');
        if (result.deactivatedDevice) {
          console.log(`[LicenseUI] Device deactivated: ${result.deactivatedDevice}`);
        }
      } else {
        console.log(`[LicenseUI] Activation failed: ${result.error}`);
      }
    } catch (e) {
      console.log(`[LicenseUI] Activation error: ${e}`);
    } finally {
      setLoading(false);
      onUpdate();
    }
  });

  row.connect('entry-activated', () => {
    activateButton.emit('clicked');
  });

  spinner.set_visible(false);

  return { row, activateButton };
}
