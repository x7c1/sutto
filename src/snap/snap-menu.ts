/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with layout buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Main = imports.ui.main;

import { getDebugConfig, isDebugMode, loadDebugConfig } from './debug-config';
import { DebugPanel } from './debug-panel';
import { SnapMenuAutoHide } from './snap-menu-auto-hide';
import {
    AUTO_HIDE_DELAY_MS,
    DEFAULT_CATEGORIES,
    DISPLAY_SPACING_HORIZONTAL,
    MAX_DISPLAYS_PER_ROW,
    MENU_BG_COLOR,
    MENU_BORDER_COLOR,
    MENU_PADDING,
    MINIATURE_DISPLAY_WIDTH,
} from './snap-menu-constants';
import type { MenuEventIds } from './snap-menu-renderer';
import { createBackground, createCategoriesView, createFooter } from './snap-menu-renderer';
import { getTestLayoutGroups } from './test-layouts';
import type { Layout, LayoutGroup, LayoutGroupCategory } from './types';

declare function log(message: string): void;

// Re-export types for backward compatibility
export type { Layout as SnapLayout, LayoutGroup as SnapLayoutGroup };

export class SnapMenu {
    private _container: St.BoxLayout | null = null;
    private _background: St.BoxLayout | null = null;
    private _categories: LayoutGroupCategory[] = [];
    private _renderedCategories: LayoutGroupCategory[] = []; // Categories actually rendered (including test layouts)
    private _onLayoutSelected: ((layout: Layout) => void) | null = null;
    private _layoutButtons: Map<St.Button, Layout> = new Map();
    private _rendererEventIds: MenuEventIds | null = null;
    private _autoHide: SnapMenuAutoHide = new SnapMenuAutoHide();
    private _debugPanel: DebugPanel | null = null;
    private _menuX: number = 0;
    private _menuY: number = 0;

    constructor() {
        // Setup auto-hide callback
        this._autoHide.setOnHide(() => {
            this.hide();
        });

        // Initialize debug mode if enabled
        if (isDebugMode()) {
            log('[SnapMenu] Debug mode is enabled, initializing debug panel');
            loadDebugConfig();
            this._debugPanel = new DebugPanel();
            this._debugPanel.setOnConfigChanged(() => {
                // Refresh menu when debug config changes
                if (this._container) {
                    this.show(this._menuX, this._menuY);
                }
            });
            this._debugPanel.setOnEnter(() => {
                this._autoHide.setDebugPanelHovered(true, AUTO_HIDE_DELAY_MS);
            });
            this._debugPanel.setOnLeave(() => {
                this._autoHide.setDebugPanelHovered(false, AUTO_HIDE_DELAY_MS);
            });
        } else {
            log('[SnapMenu] Debug mode is disabled');
        }

        // Initialize with default categories
        this._categories = DEFAULT_CATEGORIES;
    }

    /**
     * Set callback for when a layout is selected
     */
    setOnLayoutSelected(callback: (layout: Layout) => void): void {
        this._onLayoutSelected = callback;
    }

    /**
     * Show the snap menu at the specified position
     */
    show(x: number, y: number): void {
        // Hide existing menu if any
        this.hide();

        // Store menu position
        this._menuX = x;
        this._menuY = y;

        // Reset auto-hide states
        this._autoHide.resetHoverStates();

        // Get debug configuration
        const debugConfig = this._debugPanel ? getDebugConfig() : null;

        // Get screen dimensions and calculate aspect ratio
        const screenWidth = global.screen_width;
        const screenHeight = global.screen_height;
        const aspectRatio = screenHeight / screenWidth;
        const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;

        // Determine which categories to render
        let categories = this._categories;
        if (this._debugPanel && debugConfig) {
            const testGroups = getTestLayoutGroups();
            const enabledTestGroups = testGroups.filter((g) =>
                debugConfig.enabledTestGroups.has(g.name)
            );
            // Add test groups as an additional category if any are enabled
            if (enabledTestGroups.length > 0) {
                const testCategory: LayoutGroupCategory = {
                    name: 'Test Layouts',
                    layoutGroups: enabledTestGroups,
                };
                categories = [...categories, testCategory];
            }
        }

        // Store rendered categories for debug panel positioning
        this._renderedCategories = categories;

        // Create background
        const { background, clickOutsideId } = createBackground(() => {
            this.hide();
        });
        this._background = background;

        // Create categories view
        const categoriesView = createCategoriesView(
            MINIATURE_DISPLAY_WIDTH,
            miniatureDisplayHeight,
            categories,
            debugConfig,
            (layout) => {
                if (this._onLayoutSelected) {
                    this._onLayoutSelected(layout);
                }
            }
        );
        this._layoutButtons = categoriesView.layoutButtons;

        // Create footer
        const footer = createFooter();

        // Create main container
        const container = new St.BoxLayout({
            style_class: 'snap-menu',
            style: `
                background-color: ${MENU_BG_COLOR};
                border: 2px solid ${MENU_BORDER_COLOR};
                border-radius: 8px;
                padding: ${MENU_PADDING}px;
            `,
            vertical: true,
            visible: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });
        this._container = container;

        // Add children to container
        container.add_child(categoriesView.categoriesContainer);
        if (!debugConfig || debugConfig.showFooter) {
            container.add_child(footer);
        }

        // Position menu at cursor
        container.set_position(x, y);

        // Add menu container to chrome
        Main.layoutManager.addChrome(container, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Setup auto-hide
        this._autoHide.setupAutoHide(container, AUTO_HIDE_DELAY_MS);

        // Store event IDs for cleanup
        this._rendererEventIds = {
            clickOutsideId,
            buttonEvents: categoriesView.buttonEvents,
        };

        // Show debug panel if enabled
        if (this._debugPanel) {
            const menuHeight = 500;
            const debugPanelX = this._calculateDebugPanelX(x, this._renderedCategories);
            log(`[SnapMenu] Showing debug panel at: x=${debugPanelX}, y=${y}`);
            this._debugPanel.show(debugPanelX, y, menuHeight);
        }
    }

    /**
     * Hide the snap menu
     */
    hide(): void {
        if (this._container) {
            // Cleanup auto-hide
            this._autoHide.cleanup();

            // Disconnect event handlers
            if (this._rendererEventIds) {
                // Disconnect background click event
                if (this._background) {
                    this._background.disconnect(this._rendererEventIds.clickOutsideId);
                }

                // Disconnect button events
                for (const { button, enterEventId, leaveEventId, clickEventId } of this
                    ._rendererEventIds.buttonEvents) {
                    button.disconnect(enterEventId);
                    button.disconnect(leaveEventId);
                    button.disconnect(clickEventId);
                }

                this._rendererEventIds = null;
            }

            // Remove menu container
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();

            // Remove background
            if (this._background) {
                Main.layoutManager.removeChrome(this._background);
                this._background.destroy();
            }

            // Hide debug panel
            if (this._debugPanel) {
                this._debugPanel.hide();
            }

            this._container = null;
            this._background = null;
            this._layoutButtons.clear();
        }
    }

    /**
     * Check if menu is currently shown
     */
    isVisible(): boolean {
        return this._container !== null;
    }

    /**
     * Update menu position (for following cursor during drag)
     */
    updatePosition(x: number, y: number): void {
        if (this._container) {
            this._container.set_position(x, y);

            // Update debug panel position if enabled
            if (this._debugPanel && this._renderedCategories.length > 0) {
                const debugPanelX = this._calculateDebugPanelX(x, this._renderedCategories);
                this._debugPanel.updatePosition(debugPanelX, y);
            }
        }
    }

    /**
     * Calculate debug panel X position based on menu position and actual rendered categories
     */
    private _calculateDebugPanelX(
        menuX: number,
        categoriesToRender: LayoutGroupCategory[]
    ): number {
        const debugPanelGap = 20;
        const debugPanelWidth = 300;
        const screenWidth = global.screen_width;

        // Calculate menu width from ALL categories (including test layouts if enabled)
        // Categories are stacked vertically with rows, each row has max MAX_DISPLAYS_PER_ROW displays
        let maxCategoryWidth = 0;
        for (const category of categoriesToRender) {
            const numDisplays = category.layoutGroups.length;
            if (numDisplays > 0) {
                // Calculate width based on max displays per row
                const displaysInWidestRow = Math.min(numDisplays, MAX_DISPLAYS_PER_ROW);
                // Each display: width + right margin, except the last one has no right margin
                const categoryWidth =
                    displaysInWidestRow * MINIATURE_DISPLAY_WIDTH +
                    (displaysInWidestRow - 1) * DISPLAY_SPACING_HORIZONTAL;
                maxCategoryWidth = Math.max(maxCategoryWidth, categoryWidth);
                log(
                    `[SnapMenu] Category "${category.name}": ${numDisplays} displays (max ${displaysInWidestRow} per row), width=${categoryWidth}px`
                );
            }
        }
        const menuWidth = maxCategoryWidth + MENU_PADDING * 2;
        log(
            `[SnapMenu] Calculated menu width: ${menuWidth}px (maxCategoryWidth: ${maxCategoryWidth}px)`
        );

        // Try to place on the right side first
        let debugPanelX = menuX + menuWidth + debugPanelGap;
        if (debugPanelX + debugPanelWidth > screenWidth) {
            // If not, place on the left side
            debugPanelX = menuX - debugPanelWidth - debugPanelGap;
            // If still off screen, clamp to left edge
            if (debugPanelX < 0) {
                debugPanelX = debugPanelGap;
            }
        }

        return debugPanelX;
    }

    /**
     * Get layout at the given position, or null if position is not over a layout button
     * If multiple layouts overlap at this position, returns the first one found
     */
    getLayoutAtPosition(x: number, y: number): Layout | null {
        if (!this._container) {
            return null;
        }

        // Check each layout button to see if position is within its bounds
        for (const [button, layout] of this._layoutButtons.entries()) {
            const [actorX, actorY] = button.get_transformed_position();
            const [width, height] = button.get_transformed_size();

            if (x >= actorX && x <= actorX + width && y >= actorY && y <= actorY + height) {
                log(`[SnapMenu] Position (${x}, ${y}) is over layout: ${layout.label}`);
                return layout;
            }
        }

        log(`[SnapMenu] Position (${x}, ${y}) is not over any layout`);
        return null;
    }
}
