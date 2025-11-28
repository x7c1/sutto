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
                    x: '20px',
                    y: '70%',
                    width: '300px',
                    height: '300px',
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
                    x: '0',
                    y: '50%',
                    width: '1/3',
                    height: '50%',
                    zIndex: 0,
                },
                {
                    label: 'Bottom Center',
                    x: '1/3',
                    y: '50%',
                    width: '1/3',
                    height: '50%',
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: '2/3',
                    y: '50%',
                    width: '1/3',
                    height: '50%',
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
                    x: '75%',
                    y: '0',
                    width: '25%',
                    height: '50%',
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
                    x: '0',
                    y: '0',
                    width: '50%',
                    height: '50%',
                    zIndex: 0,
                },
                {
                    label: 'Top Right',
                    x: '50%',
                    y: '0',
                    width: '50%',
                    height: '50%',
                    zIndex: 0,
                },
                {
                    label: 'Bottom Left',
                    x: '0',
                    y: '50%',
                    width: '50%',
                    height: '50%',
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: '50%',
                    y: '50%',
                    width: '50%',
                    height: '50%',
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
                    x: '0',
                    y: '0',
                    width: '70%',
                    height: '100%',
                    zIndex: 0,
                },
                {
                    label: 'Top Right',
                    x: '70%',
                    y: '0',
                    width: '30%',
                    height: '60%',
                    zIndex: 0,
                },
                {
                    label: 'Bottom Right',
                    x: '70%',
                    y: '60%',
                    width: '30%',
                    height: '40%',
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
                    x: '20%',
                    y: '20%',
                    width: '60%',
                    height: '60%',
                    zIndex: 0,
                },
            ],
        },

        // Group G: Padded Layouts (percentage-based padding)
        {
            name: 'Test G - Padded Thirds',
            layouts: [
                {
                    label: 'Left Padded',
                    x: '1%',
                    y: '1%',
                    width: '1/3 - 2%',
                    height: '100% - 2%',
                    zIndex: 0,
                },
                {
                    label: 'Center Padded',
                    x: '1/3 + 1%',
                    y: '1%',
                    width: '1/3 - 2%',
                    height: '100% - 2%',
                    zIndex: 0,
                },
                {
                    label: 'Right Padded',
                    x: '2/3 + 1%',
                    y: '1%',
                    width: '1/3 - 2%',
                    height: '100% - 2%',
                    zIndex: 0,
                },
            ],
        },

        // Group H: Edge Cases (small windows with fixed pixel sizes)
        {
            name: 'Test H - Edge Cases',
            layouts: [
                {
                    label: 'Small Top Left',
                    x: '0',
                    y: '0',
                    width: '400px',
                    height: '400px',
                    zIndex: 0,
                },
                {
                    label: 'Small Bottom Right',
                    x: '100% - 400px',
                    y: '100% - 400px',
                    width: '400px',
                    height: '400px',
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
