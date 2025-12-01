/// <reference path="../../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;

import type { DebugConfig } from '../debug-config';
import { CATEGORY_SPACING, MAX_DISPLAYS_PER_ROW } from '../snap-menu-constants';
import type { Layout, LayoutGroupCategory } from '../types';
import { createMiniatureDisplayView } from './miniature-display';

export interface CategoryView {
    categoryContainer: St.BoxLayout;
    layoutButtons: Map<St.Button, Layout>;
    buttonEvents: Array<{
        button: St.Button;
        enterEventId: number;
        leaveEventId: number;
        clickEventId: number;
    }>;
}

/**
 * Create a category view with wrapping layout for miniature displays
 * Displays are arranged in rows with a maximum of MAX_DISPLAYS_PER_ROW per row
 */
export function createCategoryView(
    category: LayoutGroupCategory,
    displayWidth: number,
    displayHeight: number,
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: Layout) => void,
    isLastCategory: boolean = false
): CategoryView {
    // Category container: vertical layout to stack rows
    const categoryContainer = new St.BoxLayout({
        style_class: 'snap-category-container',
        vertical: true, // Vertical layout: stack rows
        x_expand: false,
        y_expand: false,
        style: `${!isLastCategory ? `margin-bottom: ${CATEGORY_SPACING}px;` : ''}`,
    });

    const layoutButtons = new Map<St.Button, Layout>();
    const buttonEvents: CategoryView['buttonEvents'] = [];

    // Split displays into rows
    const groups = category.layoutGroups;
    const numRows = Math.ceil(groups.length / MAX_DISPLAYS_PER_ROW);

    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
        // Create a row container for this row
        const rowContainer = new St.BoxLayout({
            style_class: 'snap-category-row',
            vertical: false, // Horizontal layout: arrange displays horizontally
            x_expand: false,
            y_expand: false,
        });

        // Add displays to this row (up to MAX_DISPLAYS_PER_ROW)
        const startIndex = rowIndex * MAX_DISPLAYS_PER_ROW;
        const endIndex = Math.min(startIndex + MAX_DISPLAYS_PER_ROW, groups.length);

        for (let i = startIndex; i < endIndex; i++) {
            const group = groups[i];
            const isLastInRow = i === endIndex - 1; // Check if this is the last display in the row
            const view = createMiniatureDisplayView(
                group,
                displayWidth,
                displayHeight,
                debugConfig,
                onLayoutSelected,
                isLastInRow
            );
            rowContainer.add_child(view.miniatureDisplay);

            // Collect layout buttons and events
            for (const [button, layout] of view.layoutButtons) {
                layoutButtons.set(button, layout);
            }
            buttonEvents.push(...view.buttonEvents);
        }

        categoryContainer.add_child(rowContainer);
    }

    return { categoryContainer, layoutButtons, buttonEvents };
}
