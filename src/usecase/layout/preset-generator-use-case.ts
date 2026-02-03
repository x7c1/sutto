import {
  BASE_LAYOUT_GROUPS,
  STANDARD_LAYOUT_GROUP_NAMES,
  WIDE_LAYOUT_GROUP_NAMES,
} from '../../domain/layout/preset-config.js';
import {
  generatePreset,
  getPresetName,
  type MonitorType,
  type SpaceCollectionData,
  type UUIDGenerator,
} from '../../domain/layout/preset-generator.js';
import type { MonitorCountProvider } from './monitor-count-provider.js';
import type { SpaceCollectionRepository } from './space-collection-repository.js';

declare function log(message: string): void;

/**
 * Use case for generating preset SpaceCollections for different monitor configurations.
 */
export class PresetGeneratorUseCase {
  constructor(
    private readonly repository: SpaceCollectionRepository,
    private readonly monitorCountProvider: MonitorCountProvider,
    private readonly uuidGenerator: UUIDGenerator
  ) {}

  /**
   * Check if a preset exists for the given monitor count and type
   */
  hasPresetForMonitorCount(monitorCount: number, monitorType: MonitorType): boolean {
    const presets = this.repository.loadPresetCollections();
    const presetName = getPresetName(monitorCount, monitorType);
    return presets.some((p) => p.name === presetName);
  }

  /**
   * Ensure presets exist for the current monitor configuration.
   * Generates both standard and wide presets if they don't exist.
   */
  ensurePresetForMonitorCount(monitorCount: number): void {
    if (monitorCount <= 0) {
      log('[PresetGenerator] Invalid monitor count, skipping preset generation');
      return;
    }

    const presets = this.repository.loadPresetCollections();
    const monitorTypes: MonitorType[] = ['standard', 'wide'];
    let updated = false;

    for (const monitorType of monitorTypes) {
      const presetName = getPresetName(monitorCount, monitorType);
      const existing = presets.find((p) => p.name === presetName);

      if (!existing) {
        log(`[PresetGenerator] Generating preset "${presetName}"`);
        const layoutGroupNames =
          monitorType === 'wide' ? WIDE_LAYOUT_GROUP_NAMES : STANDARD_LAYOUT_GROUP_NAMES;
        const newPreset = generatePreset(
          monitorCount,
          monitorType,
          layoutGroupNames,
          BASE_LAYOUT_GROUPS,
          this.uuidGenerator
        );
        presets.push(newPreset);
        updated = true;
      }
    }

    if (updated) {
      this.repository.savePresetCollections(presets);
    }
  }

  /**
   * Ensure presets exist for the current monitor count.
   * Called when main panel or settings screen opens.
   */
  ensurePresetForCurrentMonitors(): void {
    const monitorCount = this.monitorCountProvider.getMonitorCount();
    if (monitorCount === 0) {
      log('[PresetGenerator] No monitor info available, skipping preset generation');
      return;
    }
    this.ensurePresetForMonitorCount(monitorCount);
  }

  /**
   * Generate a preset for the given monitor count and type.
   */
  generatePreset(monitorCount: number, monitorType: MonitorType): SpaceCollectionData {
    const layoutGroupNames =
      monitorType === 'wide' ? WIDE_LAYOUT_GROUP_NAMES : STANDARD_LAYOUT_GROUP_NAMES;
    return generatePreset(
      monitorCount,
      monitorType,
      layoutGroupNames,
      BASE_LAYOUT_GROUPS,
      this.uuidGenerator
    );
  }
}
