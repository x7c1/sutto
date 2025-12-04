/// <reference path="../../types/build-mode.d.ts" />

const Gio = imports.gi.Gio;

import { getExtensionDataPath } from '../repository/extension-path';

declare function log(message: string): void;

export interface DebugConfig {
  // Display element toggles
  showFooter: boolean;
  showMiniatureDisplayBackground: boolean;
  showMiniatureDisplayBorder: boolean;
  showButtonBorders: boolean;

  // Debug visualization toggles
  showSpacingGuides: boolean;
  showSizeLabels: boolean;

  // Test group toggles
  enabledTestGroups: Set<string>; // Set of enabled test group names
}

// Note: Debug mode enabled/disabled is controlled by BUILD_MODE environment variable only.
// This config only stores panel toggle settings.

// Default configuration
const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  showFooter: true,
  showMiniatureDisplayBackground: true,
  showMiniatureDisplayBorder: true,
  showButtonBorders: true,
  showSpacingGuides: false,
  showSizeLabels: true,
  enabledTestGroups: new Set([
    'Test A - Bottom Left Fixed',
    'Test B - Bottom Third Split',
    'Test C - Top Right Panel',
    'Test I - Empty Group',
  ]),
};

let currentConfig: DebugConfig = {
  ...DEFAULT_DEBUG_CONFIG,
  enabledTestGroups: new Set(DEFAULT_DEBUG_CONFIG.enabledTestGroups),
};

// Check if debug mode is enabled based on __DEV__
export function isDebugMode(): boolean {
  return __DEV__;
}

export function getDebugConfig(): DebugConfig {
  return currentConfig;
}

export function setDebugConfig(config: Partial<DebugConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  saveDebugConfig(); // Auto-save on change
}

export function toggleDebugOption(option: keyof Omit<DebugConfig, 'enabledTestGroups'>): void {
  currentConfig[option] = !currentConfig[option];
  saveDebugConfig(); // Auto-save on change
}

export function toggleTestGroup(groupName: string): void {
  if (currentConfig.enabledTestGroups.has(groupName)) {
    currentConfig.enabledTestGroups.delete(groupName);
  } else {
    currentConfig.enabledTestGroups.add(groupName);
  }
  saveDebugConfig(); // Auto-save on change
}

// Persistence functions
const CONFIG_FILE_NAME = 'debug-config.json';

function getConfigFilePath(): string {
  return getExtensionDataPath(CONFIG_FILE_NAME);
}

export function loadDebugConfig(): void {
  const configPath = getConfigFilePath();
  const file = Gio.File.new_for_path(configPath);

  if (!file.query_exists(null)) {
    log('[DebugConfig] Config file does not exist, using defaults');
    return;
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log('[DebugConfig] Failed to load config file');
      return;
    }

    const contentsString = String.fromCharCode.apply(null, contents);
    const data = JSON.parse(contentsString);

    // Restore config from JSON
    currentConfig = {
      ...DEFAULT_DEBUG_CONFIG,
      ...data,
      enabledTestGroups: new Set(data.enabledTestGroups || []),
    };

    log('[DebugConfig] Config loaded successfully');
  } catch (e) {
    log(`[DebugConfig] Error loading config: ${e}`);
    // On error, keep using default config
  }
}

export function saveDebugConfig(): void {
  const configPath = getConfigFilePath();
  const file = Gio.File.new_for_path(configPath);

  try {
    // Ensure directory exists
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }

    // Convert config to JSON
    const data = {
      ...currentConfig,
      enabledTestGroups: Array.from(currentConfig.enabledTestGroups),
    };
    const json = JSON.stringify(data, null, 2);

    // Write to file
    file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    log('[DebugConfig] Config saved successfully');
  } catch (e) {
    log(`[DebugConfig] Error saving config: ${e}`);
  }
}
