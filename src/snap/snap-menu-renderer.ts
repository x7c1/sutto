/// <reference path="../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Main = imports.ui.main;

import type { DebugConfig } from './debug-config';
import { FOOTER_MARGIN_TOP, FOOTER_TEXT_COLOR } from './snap-menu-constants';
import type { Layout, LayoutGroupCategory } from './types';
import { createCategoryView } from './ui';

declare function log(message: string): void;

export interface MenuEventIds {
    clickOutsideId: number;
    buttonEvents: Array<{
        button: St.Button;
        enterEventId: number;
        leaveEventId: number;
        clickEventId: number;
    }>;
}

export interface BackgroundView {
    background: St.BoxLayout;
    clickOutsideId: number;
}

export interface CategoriesView {
    categoriesContainer: St.BoxLayout;
    layoutButtons: Map<St.Button, Layout>;
    buttonEvents: MenuEventIds['buttonEvents'];
}

/**
 * Create background overlay to capture clicks outside menu
 */
export function createBackground(onClickOutside: () => void): BackgroundView {
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
 * Create categories view with category-based rendering
 */
export function createCategoriesView(
    displayWidth: number,
    displayHeight: number,
    categories: LayoutGroupCategory[],
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: Layout) => void
): CategoriesView {
    const categoriesContainer = new St.BoxLayout({
        style_class: 'snap-categories-container',
        vertical: true, // Vertical layout: stack categories
        x_expand: false,
        y_expand: false,
    });

    const layoutButtons = new Map<St.Button, Layout>();
    const buttonEvents: MenuEventIds['buttonEvents'] = [];

    // Create one category view for each category
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const isLastCategory = i === categories.length - 1;
        const view = createCategoryView(
            category,
            displayWidth,
            displayHeight,
            debugConfig,
            onLayoutSelected,
            isLastCategory
        );
        categoriesContainer.add_child(view.categoryContainer);

        // Collect layout buttons and events
        for (const [button, layout] of view.layoutButtons) {
            layoutButtons.set(button, layout);
        }
        buttonEvents.push(...view.buttonEvents);
    }

    return { categoriesContainer, layoutButtons, buttonEvents };
}
