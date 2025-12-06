import { Preferences } from './settings/preferences';

declare function log(message: string): void;

let preferences: Preferences | null = null;

// GNOME Shell calls init() first when loading preferences
// @ts-expect-error - Called by GNOME Shell runtime
function init(metadata: ExtensionMetadata): void {
  log(`[Snappa Prefs] Initializing preferences for ${metadata.uuid}`);
  preferences = new Preferences(metadata);
}

// GNOME Shell calls this function to populate the preferences window
// @ts-expect-error - Called by GNOME Shell runtime
function fillPreferencesWindow(window: any): void {
  if (!preferences) {
    log('[Snappa Prefs] ERROR: preferences not available');
    return;
  }
  preferences.fillWindow(window);
}
