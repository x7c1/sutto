/// <reference path="../types/build-mode.d.ts" />

import type Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import type Gio from 'gi://Gio';

import { loadAllCollections } from '../app/repository/space-collection.js';
import { ensurePresetForCurrentMonitors } from '../app/service/preset-generator.js';
import { createGeneralPage } from './keyboard-shortcuts.js';
import { loadMonitors } from './monitors.js';
import {
  calculateRequiredHeight,
  calculateRequiredWidth,
  createSpacesPage,
} from './spaces-page.js';

// Window size constants
const MIN_WINDOW_WIDTH = 500;
const MIN_WINDOW_HEIGHT = 400;
const DEFAULT_SCREEN_WIDTH = 1920;
const DEFAULT_SCREEN_HEIGHT = 1080;
const WINDOW_HORIZONTAL_PADDING = 80;
const WINDOW_VERTICAL_PADDING = 100;
const SCREEN_HEIGHT_MARGIN = 100; // Margin for taskbars, panels, etc.

/**
 * Build the preferences UI
 */
export function buildPreferencesUI(window: Adw.PreferencesWindow, settings: Gio.Settings): void {
  console.log('[Snappa Prefs] Building preferences UI...');

  // Ensure presets exist for current monitor count
  console.log('[Snappa Prefs] Ensuring presets...');
  try {
    ensurePresetForCurrentMonitors();
    console.log('[Snappa Prefs] Presets ensured');
  } catch (e) {
    console.log(`[Snappa Prefs] ERROR ensuring presets: ${e}`);
  }

  // Load collections and monitors
  console.log('[Snappa Prefs] Loading collections...');
  let collections: ReturnType<typeof loadAllCollections> = [];
  try {
    collections = loadAllCollections();
    console.log(`[Snappa Prefs] Loaded ${collections.length} collections`);
  } catch (e) {
    console.log(`[Snappa Prefs] ERROR loading collections: ${e}`);
  }

  // Load monitors using any available rows
  const anyRows = collections.length > 0 ? collections[0].rows : [];
  const monitors = loadMonitors(anyRows);
  console.log(`[Snappa Prefs] Loaded ${monitors.size} monitors`);

  // Calculate required size from ALL collections (use maximum)
  let maxContentWidth = 0;
  let maxContentHeight = 0;
  for (const collection of collections) {
    const width = calculateRequiredWidth(collection.rows, monitors);
    const height = calculateRequiredHeight(collection.rows, monitors);
    maxContentWidth = Math.max(maxContentWidth, width);
    maxContentHeight = Math.max(maxContentHeight, height);
  }
  const contentWidth = maxContentWidth;
  const contentHeight = maxContentHeight;
  const { screenWidth, screenHeight } = getScreenSize();
  const windowWidth = Math.min(contentWidth + WINDOW_HORIZONTAL_PADDING, screenWidth);
  // Clamp height to screen height minus margin for taskbars/panels
  const maxWindowHeight = screenHeight - SCREEN_HEIGHT_MARGIN;
  const windowHeight = Math.min(contentHeight + WINDOW_VERTICAL_PADDING, maxWindowHeight);
  window.set_default_size(
    Math.max(windowWidth, MIN_WINDOW_WIDTH),
    Math.max(windowHeight, MIN_WINDOW_HEIGHT)
  );

  // Create General page (existing keyboard shortcut settings)
  const generalPage = createGeneralPage(window, settings);
  window.add(generalPage);

  // Get current active collection ID from settings
  const activeCollectionId = settings.get_string('active-space-collection-id') ?? '';
  console.log(`[Snappa Prefs] Active collection ID: "${activeCollectionId}"`);

  // Create Spaces page with collection selection
  console.log('[Snappa Prefs] Creating Spaces page...');
  try {
    const spacesPage = createSpacesPage(monitors, activeCollectionId, (newActiveId) => {
      settings.set_string('active-space-collection-id', newActiveId);
    });
    console.log('[Snappa Prefs] Spaces page created, adding to window...');
    window.add(spacesPage);

    // Set Spaces page as the default visible page
    window.set_visible_page(spacesPage);
    console.log('[Snappa Prefs] Spaces page set as visible');
  } catch (e) {
    console.log(`[Snappa Prefs] ERROR creating Spaces page: ${e}`);
  }
}

/**
 * Get the size of the primary screen/monitor
 */
function getScreenSize(): { screenWidth: number; screenHeight: number } {
  const display = Gdk.Display.get_default();
  if (!display) {
    return { screenWidth: DEFAULT_SCREEN_WIDTH, screenHeight: DEFAULT_SCREEN_HEIGHT };
  }

  const monitorList = display.get_monitors();
  if (!monitorList || monitorList.get_n_items() === 0) {
    return { screenWidth: DEFAULT_SCREEN_WIDTH, screenHeight: DEFAULT_SCREEN_HEIGHT };
  }

  // Get the first monitor (primary)
  const monitor = monitorList.get_item(0) as Gdk.Monitor | null;
  if (!monitor) {
    return { screenWidth: DEFAULT_SCREEN_WIDTH, screenHeight: DEFAULT_SCREEN_HEIGHT };
  }

  const geometry = monitor.get_geometry();
  return { screenWidth: geometry.width, screenHeight: geometry.height };
}
