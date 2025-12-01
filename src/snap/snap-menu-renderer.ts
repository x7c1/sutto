/// <reference path="../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Main = imports.ui.main;

import type { DebugConfig } from './debug-config';
import { FOOTER_MARGIN_TOP, FOOTER_TEXT_COLOR } from './snap-menu-constants';
import type { Layout, LayoutGroup, LayoutGroupCategory } from './types';
import { createCategoryView, createMiniatureDisplayView } from './ui';

declare function log(message: string): void;

export interface RenderedWidgets {
    background: St.BoxLayout;
    footer: St.Label;
    displaysContainer: St.BoxLayout;
}

export interface RendererEventIds {
    clickOutsideId: number;
    buttonEvents: Array<{
        button: St.Button;
        enterEventId: number;
        leaveEventId: number;
        clickEventId: number;
    }>;
}

export interface RenderResult {
    widgets: RenderedWidgets;
    layoutButtons: Map<St.Button, Layout>;
    eventIds: RendererEventIds;
}

/**
 * Create background overlay to capture clicks outside menu
 */
export function createBackground(onClickOutside: () => void): {
    background: St.BoxLayout;
    clickOutsideId: number;
} {
    const background = new St.BoxLayout({
        style: 'background-color: rgba(0, 0, 0, 0);',
        reactive: true,
        x: 0,
        y: 0,
        width: global.screen_width,
        height: global.screen_height,
    });

    // Add background first (behind menu)
    Main.layoutManager.addChrome(background, {
        affectsInputRegion: true,
        trackFullscreen: false,
    });

    // Connect click on background to close menu
    const clickOutsideId = background.connect('button-press-event', () => {
        log('[SnapMenu] Click on background, hiding menu');
        onClickOutside();
        return true; // Stop event propagation
    });

    return { background, clickOutsideId };
}

/**
 * Create footer with app name
 */
export function createFooter(): St.Label {
    return new St.Label({
        text: 'Powered by Snappa',
        style: `
            font-size: 12px;
            color: ${FOOTER_TEXT_COLOR};
            text-align: center;
            margin-top: ${FOOTER_MARGIN_TOP}px;
        `,
        x_align: 2, // CENTER
    });
}

/**
 * Create displays container with miniature displays
 */
export function createDisplaysContainer(
    displayWidth: number,
    displayHeight: number,
    layoutGroups: LayoutGroup[],
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: Layout) => void
): {
    displaysContainer: St.BoxLayout;
    layoutButtons: Map<St.Button, Layout>;
    buttonEvents: RendererEventIds['buttonEvents'];
} {
    const displaysContainer = new St.BoxLayout({
        style_class: 'snap-displays-container',
        vertical: true, // Vertical layout: stack miniature displays
        x_expand: false,
        y_expand: false,
    });

    const layoutButtons = new Map<St.Button, Layout>();
    const buttonEvents: RendererEventIds['buttonEvents'] = [];

    // Create one miniature display view for each layout group
    for (const group of layoutGroups) {
        const result = createMiniatureDisplayView(
            group,
            displayWidth,
            displayHeight,
            debugConfig,
            onLayoutSelected
        );
        displaysContainer.add_child(result.miniatureDisplay);

        // Collect layout buttons and events
        for (const [button, layout] of result.layoutButtons) {
            layoutButtons.set(button, layout);
        }
        buttonEvents.push(...result.buttonEvents);
    }

    return { displaysContainer, layoutButtons, buttonEvents };
}

/**
 * Create categories container with category-based rendering
 */
export function createCategoriesContainer(
    displayWidth: number,
    displayHeight: number,
    categories: LayoutGroupCategory[],
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: Layout) => void
): {
    displaysContainer: St.BoxLayout;
    layoutButtons: Map<St.Button, Layout>;
    buttonEvents: RendererEventIds['buttonEvents'];
} {
    const categoriesContainer = new St.BoxLayout({
        style_class: 'snap-categories-container',
        vertical: true, // Vertical layout: stack categories
        x_expand: false,
        y_expand: false,
    });

    const layoutButtons = new Map<St.Button, Layout>();
    const buttonEvents: RendererEventIds['buttonEvents'] = [];

    // Create one category view for each category
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const isLastCategory = i === categories.length - 1;
        const result = createCategoryView(
            category,
            displayWidth,
            displayHeight,
            debugConfig,
            onLayoutSelected,
            isLastCategory
        );
        categoriesContainer.add_child(result.categoryContainer);

        // Collect layout buttons and events
        for (const [button, layout] of result.layoutButtons) {
            layoutButtons.set(button, layout);
        }
        buttonEvents.push(...result.buttonEvents);
    }

    return { displaysContainer: categoriesContainer, layoutButtons, buttonEvents };
}
