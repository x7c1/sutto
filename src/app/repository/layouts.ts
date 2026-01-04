import Gio from 'gi://Gio';

import type { Layout, LayoutGroup, LayoutGroupCategory } from '../types/index.js';
import type {
  LayoutCategorySetting,
  LayoutGroupSetting,
  LayoutSetting,
} from '../types/layout-setting.js';
import { getExtensionDataPath } from './extension-path.js';
import { generateLayoutHash } from './layout-hash-generator.js';

declare function log(message: string): void;

// Storage file path
const LAYOUTS_FILE_NAME = 'imported-layouts.json';

function getLayoutsFilePath(): string {
  return getExtensionDataPath(LAYOUTS_FILE_NAME);
}

/**
 * Generates a simple UUID v4-like string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID(): string {
  const chars = '0123456789abcdef';
  let uuid = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      // Variant bits: 10xx (8, 9, a, or b)
      const randomIndex = Math.floor(Math.random() * 4);
      uuid += chars[8 + randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * 16);
      uuid += chars[randomIndex];
    }
  }

  return uuid;
}

/**
 * Converts a LayoutSetting to a Layout by adding ID and hash
 */
function settingToLayout(setting: LayoutSetting): Layout {
  return {
    id: generateUUID(),
    hash: generateLayoutHash(setting.x, setting.y, setting.width, setting.height),
    label: setting.label,
    x: setting.x,
    y: setting.y,
    width: setting.width,
    height: setting.height,
  };
}

/**
 * Converts LayoutGroupSetting to LayoutGroup
 */
function settingToLayoutGroup(groupSetting: LayoutGroupSetting): LayoutGroup {
  return {
    name: groupSetting.name,
    layouts: groupSetting.layouts.map(settingToLayout),
  };
}

/**
 * Public helper: Convert layout group settings to layout groups
 * Used for test layouts in debug mode
 */
export function convertLayoutGroupSettings(groupSettings: LayoutGroupSetting[]): LayoutGroup[] {
  return groupSettings.map(settingToLayoutGroup);
}

/**
 * Ensure test layouts are imported to the repository.
 * If test layouts category doesn't exist, import it.
 * If it exists but has different layouts, update it.
 */
export function ensureTestLayoutsImported(
  testGroupSettings: LayoutGroupSetting[]
): LayoutGroupCategory | null {
  if (testGroupSettings.length === 0) {
    return null;
  }

  try {
    const categories = loadLayouts();
    const testCategoryName = 'Test Layouts';
    let testCategory = categories.find((c) => c.name === testCategoryName);

    if (!testCategory) {
      // Test category doesn't exist, create it
      log('[LayoutsRepository] Creating Test Layouts category');
      testCategory = {
        name: testCategoryName,
        layoutGroups: testGroupSettings.map(settingToLayoutGroup),
      };
      categories.push(testCategory);
      saveLayouts(categories);
      return testCategory;
    }

    // Test category exists, check if we need to update layouts
    // For simplicity, we'll recreate all test layouts if settings change
    const existingGroupNames = testCategory.layoutGroups.map((g) => g.name).sort();
    const newGroupNames = testGroupSettings.map((g) => g.name).sort();

    const groupsChanged =
      existingGroupNames.length !== newGroupNames.length ||
      existingGroupNames.some((name, i) => name !== newGroupNames[i]);

    if (groupsChanged) {
      log('[LayoutsRepository] Updating Test Layouts category');
      // Find groups that should be removed (disabled in debug config)
      const newGroupNamesSet = new Set(newGroupNames);
      testCategory.layoutGroups = testCategory.layoutGroups.filter((g) =>
        newGroupNamesSet.has(g.name)
      );

      // Add new groups that don't exist yet
      const existingGroupNamesSet = new Set(testCategory.layoutGroups.map((g) => g.name));
      for (const groupSetting of testGroupSettings) {
        if (!existingGroupNamesSet.has(groupSetting.name)) {
          testCategory.layoutGroups.push(settingToLayoutGroup(groupSetting));
        }
      }

      saveLayouts(categories);
    }

    return testCategory;
  } catch (e) {
    log(`[LayoutsRepository] Error ensuring test layouts: ${e}`);
    return null;
  }
}

/**
 * Converts LayoutCategorySetting to LayoutGroupCategory
 */
function settingToCategory(categorySetting: LayoutCategorySetting): LayoutGroupCategory {
  return {
    name: categorySetting.name,
    layoutGroups: categorySetting.layoutGroups.map(settingToLayoutGroup),
  };
}

/**
 * Import settings as layouts and persist to disk.
 * Converts settings to layouts by adding UUID and hash to each layout.
 */
export function importSettings(settings: LayoutCategorySetting[]): void {
  try {
    const categories = settings.map(settingToCategory);
    saveLayouts(categories);
    log('[LayoutsRepository] Settings imported successfully');
  } catch (e) {
    log(`[LayoutsRepository] Error importing settings: ${e}`);
  }
}

/**
 * Load persisted layouts from disk.
 * Returns layouts with IDs and hashes already attached.
 */
export function loadLayouts(): LayoutGroupCategory[] {
  const layoutsPath = getLayoutsFilePath();
  const file = Gio.File.new_for_path(layoutsPath);

  if (!file.query_exists(null)) {
    log('[LayoutsRepository] Layouts file does not exist, returning empty array');
    return [];
  }

  try {
    const [success, contents] = file.load_contents(null);
    if (!success) {
      log('[LayoutsRepository] Failed to load layouts file');
      return [];
    }

    const contentsString = new TextDecoder('utf-8').decode(contents);
    const categories: LayoutGroupCategory[] = JSON.parse(contentsString);

    log('[LayoutsRepository] Layouts loaded successfully');
    return categories;
  } catch (e) {
    log(`[LayoutsRepository] Error loading layouts: ${e}`);
    return [];
  }
}

/**
 * Save layouts to disk
 */
function saveLayouts(categories: LayoutGroupCategory[]): void {
  const layoutsPath = getLayoutsFilePath();
  const file = Gio.File.new_for_path(layoutsPath);

  try {
    // Ensure directory exists
    const parent = file.get_parent();
    if (parent && !parent.query_exists(null)) {
      parent.make_directory_with_parents(null);
    }

    // Write to file
    const json = JSON.stringify(categories, null, 2);
    file.replace_contents(json, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

    log('[LayoutsRepository] Layouts saved successfully');
  } catch (e) {
    log(`[LayoutsRepository] Error saving layouts: ${e}`);
  }
}

/**
 * Add a single layout setting to the repository.
 * Converts the setting to a layout (adds UUID + hash) and saves it.
 */
export function addLayout(setting: LayoutSetting, categoryName: string, groupName: string): void {
  try {
    const categories = loadLayouts();
    const category = categories.find((c) => c.name === categoryName);

    if (!category) {
      log(`[LayoutsRepository] Category "${categoryName}" not found`);
      return;
    }

    const group = category.layoutGroups.find((g) => g.name === groupName);

    if (!group) {
      log(`[LayoutsRepository] Group "${groupName}" not found in category "${categoryName}"`);
      return;
    }

    // Convert setting to layout (add ID and hash)
    const layout = settingToLayout(setting);

    // Check for duplicates using hash
    const isDuplicate = group.layouts.some((l) => l.hash === layout.hash);
    if (isDuplicate) {
      log(
        `[LayoutsRepository] Layout with identical coordinates already exists (hash: ${layout.hash})`
      );
      return;
    }

    group.layouts.push(layout);
    saveLayouts(categories);

    log('[LayoutsRepository] Layout added successfully');
  } catch (e) {
    log(`[LayoutsRepository] Error adding layout: ${e}`);
  }
}
