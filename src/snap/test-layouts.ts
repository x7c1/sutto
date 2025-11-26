import type { SnapLayoutGroup } from './snap-menu-types';

/**
 * Test layout groups for debugging purposes
 *
 * These layouts are only used when BUILD_MODE=debug and provide
 * comprehensive test cases for UI development and validation.
 */
export function getTestLayoutGroups(): SnapLayoutGroup[] {
    return [
        // Group A: Fixed Position Layouts
        {
            name: 'Test A - Bottom Left Fixed',
            layouts: [
                {
                    label: 'Bottom Left',
                    x: 0.02, // 20px from left (approximation)
                    y: 0.7, // ~70% down from top
                    width: 0.2, // ~300px width
                    height: 0.28, // ~300px height
                    zIndex: 0,
                },
            ],
        },

        // Group B: Bottom Third Split
        {
            name: 'Test B - Bottom Third Split',
            layouts: [
                {
                    label: 'Bottom Left',
                    x: 0,
                    y: 0.5,
                    width: 0.333,
                    height: 0.5,
                    zIndex: 0,
                },
                {
                    label: 'Bottom Center',
                    x: 0.333,
                    y: 0.5,
                    width: 0.334,
                    height: 0.5,
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: 0.667,
                    y: 0.5,
                    width: 0.333,
                    height: 0.5,
                    zIndex: 0,
                },
            ],
        },

        // Group C: Right-Aligned Panel
        {
            name: 'Test C - Top Right Panel',
            layouts: [
                {
                    label: 'Top Right',
                    x: 0.75, // Right-aligned
                    y: 0,
                    width: 0.25,
                    height: 0.5,
                    zIndex: 0,
                },
            ],
        },

        // Group D: Grid 2x2
        {
            name: 'Test D - Grid 2x2',
            layouts: [
                {
                    label: 'Top Left',
                    x: 0,
                    y: 0,
                    width: 0.5,
                    height: 0.5,
                    zIndex: 0,
                },
                {
                    label: 'Top Right',
                    x: 0.5,
                    y: 0,
                    width: 0.5,
                    height: 0.5,
                    zIndex: 0,
                },
                {
                    label: 'Bottom Left',
                    x: 0,
                    y: 0.5,
                    width: 0.5,
                    height: 0.5,
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: 0.5,
                    y: 0.5,
                    width: 0.5,
                    height: 0.5,
                    zIndex: 0,
                },
            ],
        },

        // Group E: Asymmetric Mix
        {
            name: 'Test E - Asymmetric Mix',
            layouts: [
                {
                    label: 'Left Wide',
                    x: 0,
                    y: 0,
                    width: 0.7,
                    height: 1,
                    zIndex: 0,
                },
                {
                    label: 'Top Right',
                    x: 0.7,
                    y: 0,
                    width: 0.3,
                    height: 0.6,
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: 0.7,
                    y: 0.6,
                    width: 0.3,
                    height: 0.4,
                    zIndex: 0,
                },
            ],
        },

        // Group F: Centered Window
        {
            name: 'Test F - Centered Window',
            layouts: [
                {
                    label: 'Center',
                    x: 0.2, // Centered (20% from left)
                    y: 0.2, // Centered (20% from top)
                    width: 0.6, // 60% width
                    height: 0.6, // 60% height
                    zIndex: 0,
                },
            ],
        },

        // Group G: Padded Layouts
        {
            name: 'Test G - Padded Thirds',
            layouts: [
                {
                    label: 'Left Padded',
                    x: 0.01, // ~10px padding
                    y: 0.01,
                    width: 0.323, // 1/3 minus padding
                    height: 0.98,
                    zIndex: 0,
                },
                {
                    label: 'Center Padded',
                    x: 0.343,
                    y: 0.01,
                    width: 0.324,
                    height: 0.98,
                    zIndex: 0,
                },
                {
                    label: 'Right Padded',
                    x: 0.677,
                    y: 0.01,
                    width: 0.323,
                    height: 0.98,
                    zIndex: 0,
                },
            ],
        },

        // Group H: Edge Cases
        {
            name: 'Test H - Edge Cases',
            layouts: [
                {
                    label: 'Tiny Top Left',
                    x: 0,
                    y: 0,
                    width: 0.08, // ~100px
                    height: 0.1, // ~100px
                    zIndex: 0,
                },
                {
                    label: 'Tiny Bottom Right',
                    x: 0.92,
                    y: 0.9,
                    width: 0.08,
                    height: 0.1,
                    zIndex: 0,
                },
            ],
        },

        // Group I: Empty Layout Group
        {
            name: 'Test I - Empty Group',
            layouts: [],
        },
    ];
}
