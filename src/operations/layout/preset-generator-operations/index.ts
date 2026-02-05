import type { SpaceCollection } from '../../../domain/layout/types.js';
import {
  BASE_LAYOUT_GROUPS,
  STANDARD_LAYOUT_GROUP_NAMES,
  WIDE_LAYOUT_GROUP_NAMES,
} from '../../../domain/settings/index.js';
import type { UUIDGenerator } from '../../../libs/uuid/index.js';
import type { MonitorCountRepository, MonitorDetector } from '../../monitor/index.js';
import type { SpaceCollectionRepository } from '../space-collection-repository.js';
import { generatePreset, getPresetName, type MonitorType } from './preset-generator.js';

declare function log(message: string): void;

/**
 * Operations for generating preset SpaceCollections for different monitor configurations.
 */
export class PresetGeneratorOperations {
  constructor(
    private readonly repository: SpaceCollectionRepository,
    private readonly monitorCountRepository: MonitorCountRepository,
    private readonly monitorDetector: MonitorDetector,
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
    const monitorCount =
      this.monitorCountRepository.loadMonitorCount() ?? this.monitorDetector.detectMonitorCount();
    if (monitorCount === 0) {
      log('[PresetGenerator] No monitor info available, skipping preset generation');
      return;
    }
    this.ensurePresetForMonitorCount(monitorCount);
  }

  /**
   * Generate a preset for the given monitor count and type.
   */
  generatePreset(monitorCount: number, monitorType: MonitorType): SpaceCollection {
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
