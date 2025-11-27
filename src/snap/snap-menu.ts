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
    DEFAULT_LAYOUT_GROUPS,
    MENU_BG_COLOR,
    MENU_BORDER_COLOR,
    MENU_PADDING,
    MINIATURE_DISPLAY_WIDTH,
} from './snap-menu-constants';
import type { RendererEventIds } from './snap-menu-renderer';
import { createBackground, createDisplaysContainer, createFooter } from './snap-menu-renderer';
import type { SnapLayout, SnapLayoutGroup } from './snap-menu-types';
import { getTestLayoutGroups } from './test-layouts';

declare function log(message: string): void;

// Re-export types for backward compatibility
export type { SnapLayout, SnapLayoutGroup };

export class SnapMenu {
    private _container: St.BoxLayout | null = null;
    private _background: St.BoxLayout | null = null;
    private _layoutGroups: SnapLayoutGroup[] = [];
    private _onLayoutSelected: ((layout: SnapLayout) => void) | null = null;
    private _layoutButtons: Map<St.Button, SnapLayout> = new Map();
    private _rendererEventIds: RendererEventIds | null = null;
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
        }

        // Initialize with default layout groups
        this._layoutGroups = DEFAULT_LAYOUT_GROUPS;
    }

    /**
     * Set callback for when a layout is selected
     */
    setOnLayoutSelected(callback: (layout: SnapLayout) => void): void {
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

        // Determine which layout groups to render
        let layoutGroups = this._layoutGroups;
        if (this._debugPanel && debugConfig) {
            const testGroups = getTestLayoutGroups();
            const enabledTestGroups = testGroups.filter((g) =>
                debugConfig.enabledTestGroups.has(g.name)
            );
            layoutGroups = [...layoutGroups, ...enabledTestGroups];
        }

        // Create background
        const { background, clickOutsideId } = createBackground(() => {
            this.hide();
        });
        this._background = background;

        // Create displays container
        const displayResult = createDisplaysContainer(
            MINIATURE_DISPLAY_WIDTH,
            miniatureDisplayHeight,
            layoutGroups,
            debugConfig,
            (layout) => {
                if (this._onLayoutSelected) {
                    this._onLayoutSelected(layout);
                }
            }
        );
        this._layoutButtons = displayResult.layoutButtons;

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
        container.add_child(displayResult.displaysContainer);
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
            buttonEvents: displayResult.buttonEvents,
        };

        // Show debug panel if enabled
        if (this._debugPanel) {
            const menuWidth = MINIATURE_DISPLAY_WIDTH + MENU_PADDING * 2;
            const menuHeight = 500;
            this._debugPanel.show(x + menuWidth + 20, y, menuHeight);
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
        }
    }

    /**
     * Get layout at the given position, or null if position is not over a layout button
     * If multiple layouts overlap at this position, returns the one with highest zIndex
     */
    getLayoutAtPosition(x: number, y: number): SnapLayout | null {
        if (!this._container) {
            return null;
        }

        let topLayout: SnapLayout | null = null;
        let topZIndex = -Infinity;

        // Check each layout button to see if position is within its bounds
        for (const [button, layout] of this._layoutButtons.entries()) {
            const [actorX, actorY] = button.get_transformed_position();
            const [width, height] = button.get_transformed_size();

            if (x >= actorX && x <= actorX + width && y >= actorY && y <= actorY + height) {
                // If this layout has a higher zIndex than current top, use it
                if (layout.zIndex > topZIndex) {
                    topLayout = layout;
                    topZIndex = layout.zIndex;
                }
            }
        }

        if (topLayout) {
            log(
                `[SnapMenu] Position (${x}, ${y}) is over layout: ${topLayout.label} (zIndex: ${topZIndex})`
            );
        } else {
            log(`[SnapMenu] Position (${x}, ${y}) is not over any layout`);
        }

        return topLayout;
    }
}
