import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectionId, type SpaceCollection } from '../../../domain/layout/index.js';
import type { LayoutConfiguration, LayoutGroupSetting } from '../../../domain/settings/index.js';
import { BASE_LAYOUT_GROUPS } from '../../../domain/settings/index.js';
import { uuidGenerator } from '../../../libs/uuid/index.js';
import type { SpaceCollectionRepository } from '../space-collection-repository.js';
import { importLayoutConfigurationFromJson } from './import-collection.js';

// --- Test Helpers ---

interface FakeRepository extends SpaceCollectionRepository {
  readonly customCollections: SpaceCollection[];
}

function createFakeRepository(): FakeRepository {
  const customCollections: SpaceCollection[] = [];

  return {
    customCollections,
    loadPresetCollections: () => [],
    savePresetCollections: () => {},
    loadCustomCollections: () => customCollections,
    saveCustomCollections: () => {},
    loadAllCollections: () => customCollections,
    addCustomCollection: (collection) => {
      const created = { ...collection, id: new CollectionId(uuidGenerator.generate()) };
      customCollections.push(created);
      return created;
    },
    deleteCustomCollection: () => false,
    findCollectionById: () => undefined,
    updateSpaceEnabled: () => false,
  };
}

function createConfiguration(layoutGroups: unknown[]): unknown {
  return {
    name: 'Imported',
    layoutGroups,
    rows: [{ spaces: [{ displays: { '0': 'two-split' } }] }],
  };
}

const VALID_LAYOUT_GROUP: LayoutGroupSetting = {
  name: 'two-split',
  layouts: [
    { label: 'Left Half', x: '0', y: '0', width: '50%', height: '100%' },
    { label: 'Right Half', x: '50%', y: '0', width: '1/2', height: '100% - 10px' },
  ],
};

function importConfiguration(
  repository: SpaceCollectionRepository,
  config: unknown
): SpaceCollection | null {
  return importLayoutConfigurationFromJson(repository, JSON.stringify(config));
}

// --- Tests ---

describe('importLayoutConfigurationFromJson', () => {
  let logMessages: string[];

  beforeEach(() => {
    logMessages = [];
    vi.stubGlobal('log', (message: string) => {
      logMessages.push(message);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imports a well-formed configuration', () => {
    const repository = createFakeRepository();

    const collection = importConfiguration(repository, createConfiguration([VALID_LAYOUT_GROUP]));

    expect(collection).not.toBeNull();
    expect(collection?.name).toBe('Imported');
    expect(repository.customCollections).toHaveLength(1);

    const layouts = collection?.rows[0].spaces[0].displays['0'].layouts;
    expect(layouts?.map((layout) => layout.label)).toEqual(['Left Half', 'Right Half']);
  });

  for (const field of ['x', 'y', 'width', 'height'] as const) {
    it(`rejects a layout with a malformed "${field}" expression`, () => {
      const repository = createFakeRepository();
      const group: LayoutGroupSetting = {
        ...VALID_LAYOUT_GROUP,
        layouts: [{ ...VALID_LAYOUT_GROUP.layouts[0], [field]: '100' }],
      };

      const collection = importConfiguration(repository, createConfiguration([group]));

      expect(collection).toBeNull();
      expect(repository.customCollections).toHaveLength(0);
    });
  }

  it('logs the group, the label, the field and the offending value of a malformed expression', () => {
    const repository = createFakeRepository();
    const group: LayoutGroupSetting = {
      ...VALID_LAYOUT_GROUP,
      layouts: [{ ...VALID_LAYOUT_GROUP.layouts[0], width: '50em' }],
    };

    importConfiguration(repository, createConfiguration([group]));

    const message = logMessages.find((line) => line.includes('50em'));
    expect(message).toBeDefined();
    expect(message).toContain('two-split');
    expect(message).toContain('Left Half');
    expect(message).toContain('width');
  });

  // Each case is the single malformed layout group of the imported file, with the fragments that
  // its rejection log line must contain to point at the offending group or layout.
  const malformedGroups: [description: string, group: unknown, logFragments: string[]][] = [
    ['a layout group that is not an object', null, ['index 0']],
    ['a layout group without a name', { layouts: [] }, ['index 0']],
    ['a layout group without a layouts array', { name: 'two-split' }, ['two-split']],
    [
      'a layout that is not an object',
      { name: 'two-split', layouts: [null] },
      ['two-split', 'index 0'],
    ],
    [
      'a layout without a label',
      { name: 'two-split', layouts: [{ x: '0', y: '0', width: '50%', height: '100%' }] },
      ['two-split', 'index 0'],
    ],
    [
      'a layout whose expression field is not a string',
      {
        name: 'two-split',
        layouts: [{ label: 'Left Half', x: 0, y: '0', width: '50%', height: '100%' }],
      },
      ['Left Half', '"x"'],
    ],
  ];

  for (const [description, group, logFragments] of malformedGroups) {
    it(`rejects ${description}`, () => {
      const repository = createFakeRepository();

      const collection = importConfiguration(repository, createConfiguration([group]));

      expect(collection).toBeNull();
      expect(repository.customCollections).toHaveLength(0);
      for (const fragment of logFragments) {
        expect(logMessages.some((line) => line.includes(fragment))).toBe(true);
      }
    });
  }

  it('accepts every expression used by the built-in presets', () => {
    const repository = createFakeRepository();
    const config: LayoutConfiguration = {
      name: 'Presets',
      layoutGroups: BASE_LAYOUT_GROUPS,
      rows: BASE_LAYOUT_GROUPS.map((group) => ({
        spaces: [{ displays: { '0': group.name } }],
      })),
    };

    const collection = importConfiguration(repository, config);

    expect(collection).not.toBeNull();

    // Comparing the labels proves every preset layout - and so every preset expression - went
    // through the validation, instead of the assertion passing on an empty set of presets.
    const importedLabels = collection?.rows.flatMap((row) =>
      row.spaces.flatMap((space) =>
        Object.values(space.displays).flatMap((group) =>
          group.layouts.map((layout) => layout.label)
        )
      )
    );
    expect(importedLabels).toEqual(
      BASE_LAYOUT_GROUPS.flatMap((group) => group.layouts.map((layout) => layout.label))
    );
  });
});
