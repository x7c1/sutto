import type { LayoutGroupSetting } from '../types/layout-setting.js';

/**
 * Base layout group definitions
 * These are reusable layout configurations that can be referenced by name in SpaceSettings
 */
export const BASE_LAYOUT_GROUPS: LayoutGroupSetting[] = [
  {
    name: 'vertical 2-split',
    layouts: [
      { label: 'Left Half', x: '0', y: '0', width: '50%', height: '100%' },
      { label: 'Right Half', x: '50%', y: '0', width: '50%', height: '100%' },
    ],
  },
  {
    name: 'horizontal 2-split',
    layouts: [
      { label: 'Top Half', x: '0', y: '0', width: '100%', height: '50%' },
      { label: 'Bottom Half', x: '0', y: '50%', width: '100%', height: '50%' },
    ],
  },
  {
    name: 'vertical 3-split',
    layouts: [
      { label: 'Left Third', x: '0', y: '0', width: '1/3', height: '100%' },
      { label: 'Center Third', x: '1/3', y: '0', width: '1/3', height: '100%' },
      { label: 'Right Third', x: '2/3', y: '0', width: '1/3', height: '100%' },
    ],
  },
  {
    name: 'vertical 3-split wide center',
    layouts: [
      { label: 'Left Third', x: '0', y: '0', width: '1/4', height: '100%' },
      { label: 'Center Third', x: '1/4', y: '0', width: '1/2', height: '100%' },
      { label: 'Right Third', x: '3/4', y: '0', width: '1/4', height: '100%' },
    ],
  },
  {
    name: 'grid 3x2',
    layouts: [
      { label: 'Top Left', x: '0', y: '0', width: '1/3', height: '50%' },
      { label: 'Top Center', x: '1/3', y: '0', width: '1/3', height: '50%' },
      { label: 'Top Right', x: '2/3', y: '0', width: '1/3', height: '50%' },
      { label: 'Bottom Left', x: '0', y: '50%', width: '1/3', height: '50%' },
      { label: 'Bottom Center', x: '1/3', y: '50%', width: '1/3', height: '50%' },
      { label: 'Bottom Right', x: '2/3', y: '50%', width: '1/3', height: '50%' },
    ],
  },
  {
    name: 'grid 4x2',
    layouts: [
      { label: 'Top Left 1', x: '0', y: '0', width: '25%', height: '50%' },
      { label: 'Top Left 2', x: '25%', y: '0', width: '25%', height: '50%' },
      { label: 'Top Right 1', x: '50%', y: '0', width: '25%', height: '50%' },
      { label: 'Top Right 2', x: '75%', y: '0', width: '25%', height: '50%' },
      { label: 'Bottom Left 1', x: '0', y: '50%', width: '25%', height: '50%' },
      { label: 'Bottom Left 2', x: '25%', y: '50%', width: '25%', height: '50%' },
      { label: 'Bottom Right 1', x: '50%', y: '50%', width: '25%', height: '50%' },
      { label: 'Bottom Right 2', x: '75%', y: '50%', width: '25%', height: '50%' },
    ],
  },
  {
    name: 'full screen',
    layouts: [{ label: 'full', x: '0', y: '0', width: '100%', height: '100%' }],
  },
];

/**
 * Layout groups for wide monitors (aspect ratio >= 21:9)
 * Used when generating presets for ultrawide monitors
 */
export const WIDE_LAYOUT_GROUP_NAMES = [
  'vertical 3-split',
  'vertical 3-split wide center',
  'vertical 2-split',
  'grid 4x2',
  'grid 3x2',
  'full screen',
];

/**
 * Layout groups for standard monitors (16:9 and similar)
 * Used when generating presets for standard aspect ratio monitors
 */
export const STANDARD_LAYOUT_GROUP_NAMES = [
  'vertical 2-split',
  'horizontal 2-split',
  'vertical 3-split',
  'full screen',
];
