import { describe, expect, it } from 'vitest';
import {
  pruneStaleReloadUuids,
  pruneStaleReloadUuidsFromSettings,
  type ShellExtensionSettingsPort,
} from './prune-stale-uuids.js';

const BASE_UUID = 'sutto@x7c1.github.io';

// --- Fake port ---

interface FakePortRecord {
  enabledWrites: string[][];
  disabledWrites: string[][];
}

function createFakePort(
  initial: { enabled?: string[]; disabled?: string[] } = {}
): ShellExtensionSettingsPort & { record: FakePortRecord } {
  let enabled = [...(initial.enabled ?? [])];
  let disabled = [...(initial.disabled ?? [])];
  const record: FakePortRecord = { enabledWrites: [], disabledWrites: [] };

  return {
    record,
    getEnabledExtensions: () => [...enabled],
    setEnabledExtensions: (uuids: string[]) => {
      enabled = [...uuids];
      record.enabledWrites.push([...uuids]);
    },
    getDisabledExtensions: () => [...disabled],
    setDisabledExtensions: (uuids: string[]) => {
      disabled = [...uuids];
      record.disabledWrites.push([...uuids]);
    },
  };
}

// --- Pure function: pruneStaleReloadUuids ---

describe('pruneStaleReloadUuids', () => {
  it('removes stale reload UUIDs but keeps the canonical UUID and the current reload UUID', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const input = [
      BASE_UUID,
      `${BASE_UUID}-reload-1719300000000100`,
      `${BASE_UUID}-reload-1719300000000200`,
      currentReload,
    ];

    const result = pruneStaleReloadUuids(input, BASE_UUID, currentReload);

    expect(result).toEqual([BASE_UUID, currentReload]);
  });

  it('returns an equivalent list when there are no stale reload UUIDs', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const input = [BASE_UUID, currentReload];

    const result = pruneStaleReloadUuids(input, BASE_UUID, currentReload);

    expect(result).toEqual(input);
  });

  it('leaves unrelated extension UUIDs untouched', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const input = [
      'other-extension@example.com',
      `other-extension@example.com-reload-1719300000000100`,
      `${BASE_UUID}-reload-1719300000000100`,
      currentReload,
    ];

    const result = pruneStaleReloadUuids(input, BASE_UUID, currentReload);

    expect(result).toEqual([
      'other-extension@example.com',
      `other-extension@example.com-reload-1719300000000100`,
      currentReload,
    ]);
  });

  it('matches only `<base>-reload-<digits>` exactly (non-digit suffix is preserved)', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const input = [
      BASE_UUID,
      `${BASE_UUID}-reload-foo`,
      `${BASE_UUID}-reload-123abc`,
      `${BASE_UUID}-reload-`,
      `${BASE_UUID}-reload-1719300000000100`,
      currentReload,
    ];

    const result = pruneStaleReloadUuids(input, BASE_UUID, currentReload);

    expect(result).toEqual([
      BASE_UUID,
      `${BASE_UUID}-reload-foo`,
      `${BASE_UUID}-reload-123abc`,
      `${BASE_UUID}-reload-`,
      currentReload,
    ]);
  });

  it('preserves order of surviving entries', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const input = [
      'a@example.com',
      `${BASE_UUID}-reload-1719300000000100`,
      'b@example.com',
      currentReload,
      'c@example.com',
      `${BASE_UUID}-reload-1719300000000200`,
    ];

    const result = pruneStaleReloadUuids(input, BASE_UUID, currentReload);

    expect(result).toEqual(['a@example.com', 'b@example.com', currentReload, 'c@example.com']);
  });

  it('escapes regex-special characters in the base UUID', () => {
    const exoticBase = 'weird.name+tag@example.com';
    const currentReload = `${exoticBase}-reload-42`;
    const input = [exoticBase, `${exoticBase}-reload-1`, `${exoticBase}-reload-2`, currentReload];

    const result = pruneStaleReloadUuids(input, exoticBase, currentReload);

    expect(result).toEqual([exoticBase, currentReload]);
  });
});

// --- Orchestration: pruneStaleReloadUuidsFromSettings ---

describe('pruneStaleReloadUuidsFromSettings', () => {
  it('prunes both enabled and disabled arrays, preserving canonical and current reload UUIDs', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const port = createFakePort({
      enabled: [BASE_UUID, currentReload, `${BASE_UUID}-reload-1719300000000100`],
      disabled: [`${BASE_UUID}-reload-1719300000000050`, `${BASE_UUID}-reload-1719300000000200`],
    });

    pruneStaleReloadUuidsFromSettings(port, BASE_UUID, currentReload);

    expect(port.getEnabledExtensions()).toEqual([BASE_UUID, currentReload]);
    expect(port.getDisabledExtensions()).toEqual([]);
    expect(port.record.enabledWrites).toHaveLength(1);
    expect(port.record.disabledWrites).toHaveLength(1);
  });

  it('performs no writes when both arrays are already clean', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const port = createFakePort({
      enabled: [BASE_UUID, currentReload],
      disabled: ['other-extension@example.com'],
    });

    pruneStaleReloadUuidsFromSettings(port, BASE_UUID, currentReload);

    expect(port.record.enabledWrites).toHaveLength(0);
    expect(port.record.disabledWrites).toHaveLength(0);
  });

  it('writes only the array that actually changed', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const port = createFakePort({
      enabled: [BASE_UUID, currentReload], // already clean
      disabled: [`${BASE_UUID}-reload-1719300000000100`], // needs pruning
    });

    pruneStaleReloadUuidsFromSettings(port, BASE_UUID, currentReload);

    expect(port.record.enabledWrites).toHaveLength(0);
    expect(port.record.disabledWrites).toEqual([[]]);
    expect(port.getDisabledExtensions()).toEqual([]);
  });

  it('leaves unrelated extensions in both arrays untouched', () => {
    const currentReload = `${BASE_UUID}-reload-1719300000000300`;
    const port = createFakePort({
      enabled: [
        'other-extension@example.com',
        BASE_UUID,
        currentReload,
        `${BASE_UUID}-reload-1719300000000100`,
      ],
      disabled: ['yet-another@example.com', `${BASE_UUID}-reload-1719300000000050`],
    });

    pruneStaleReloadUuidsFromSettings(port, BASE_UUID, currentReload);

    expect(port.getEnabledExtensions()).toEqual([
      'other-extension@example.com',
      BASE_UUID,
      currentReload,
    ]);
    expect(port.getDisabledExtensions()).toEqual(['yet-another@example.com']);
  });
});
