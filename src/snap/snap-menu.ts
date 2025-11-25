/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Snap Menu
 *
 * Displays a menu with layout buttons for snapping windows to different positions.
 * The menu appears at the cursor position when the user drags a window to a screen edge.
 */

const St = imports.gi.St;
const Main = imports.ui.main;

declare function log(message: string): void;

const MENU_WIDTH = 300;
const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding menu when cursor leaves

export interface SnapLayout {
    label: string;
    x: number; // percentage of screen width (0-1)
    y: number; // percentage of screen height (0-1)
    width: number; // percentage of screen width (0-1)
    height: number; // percentage of screen height (0-1)
    zIndex: number; // stacking order for overlapping layouts
}

export interface SnapLayoutGroup {
    name: string;
    layouts: SnapLayout[];
}

export class SnapMenu {
    private _container: St.BoxLayout | null = null;
    private _layoutGroups: SnapLayoutGroup[] = [];
    private _onLayoutSelected: ((layout: SnapLayout) => void) | null = null;
    private _layoutButtons: Map<St.Button, SnapLayout> = new Map();
    private _clickOutsideId: number | null = null;
    private _autoHideTimeoutId: number | null = null;
    private _leaveEventId: number | null = null;
    private _enterEventId: number | null = null;

    constructor() {
        // Initialize with default layout groups
        this._layoutGroups = [
            {
                name: 'Two-Way Split',
                layouts: [
                    {
                        label: 'Left Half',
                        x: 0,
                        y: 0,
                        width: 0.5,
                        height: 1,
                        zIndex: 0,
                    },
                    {
                        label: 'Right Half',
                        x: 0.5,
                        y: 0,
                        width: 0.5,
                        height: 1,
                        zIndex: 0,
                    },
                ],
            },
            {
                name: 'Three-Way Split',
                layouts: [
                    {
                        label: 'Left Third',
                        x: 0,
                        y: 0,
                        width: 0.333,
                        height: 1,
                        zIndex: 0,
                    },
                    {
                        label: 'Center Third',
                        x: 0.333,
                        y: 0,
                        width: 0.334,
                        height: 1,
                        zIndex: 0,
                    },
                    {
                        label: 'Right Third',
                        x: 0.667,
                        y: 0,
                        width: 0.333,
                        height: 1,
                        zIndex: 0,
                    },
                ],
            },
        ];
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

        // Clear layout buttons map
        this._layoutButtons.clear();

        // Get screen dimensions and calculate aspect ratio
        const screenWidth = global.screen_width;
        const screenHeight = global.screen_height;
        const aspectRatio = screenHeight / screenWidth;

        // Calculate group dimensions (fit within menu width minus padding)
        const groupWidth = MENU_WIDTH - 24; // 12px padding on each side
        const groupHeight = groupWidth * aspectRatio;
        const groupSpacing = 10;

        // Calculate total menu height
        const titleHeight = 40; // Approximate title height
        const cancelButtonHeight = 40; // Approximate cancel button height
        const totalGroupsHeight = this._layoutGroups.length * groupHeight;
        const totalSpacing = (this._layoutGroups.length - 1) * groupSpacing;
        const menuHeight = titleHeight + totalGroupsHeight + totalSpacing + cancelButtonHeight + 24; // 24 for padding

        // Create container
        this._container = new St.BoxLayout({
            style_class: 'snap-menu',
            style: `
                background-color: rgba(40, 40, 40, 0.95);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px;
            `,
            vertical: true,
            width: MENU_WIDTH,
            height: menuHeight,
            visible: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Add title
        const title = new St.Label({
            text: 'Snap Window',
            style: `
                font-size: 16px;
                font-weight: bold;
                color: white;
                margin-bottom: 12px;
            `,
            x_align: 2, // CENTER
        });
        this._container.add_child(title);

        // Add layout groups
        for (let i = 0; i < this._layoutGroups.length; i++) {
            const group = this._layoutGroups[i];
            const groupContainer = this._createGroupContainer(group, groupWidth, groupHeight);
            this._container.add_child(groupContainer as any);

            // Add spacing between groups (except after last group)
            if (i < this._layoutGroups.length - 1) {
                const spacer = new St.Widget({
                    height: groupSpacing,
                });
                this._container.add_child(spacer);
            }
        }

        // Add cancel button
        const cancelButton = this._createCancelButton();
        this._container.add_child(cancelButton);

        // Add invisible background to capture clicks outside menu
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
        this._clickOutsideId = background.connect('button-press-event', () => {
            log('[SnapMenu] Click on background, hiding menu');
            this.hide();
            return true; // Stop event propagation
        });

        // Position menu at cursor
        this._container.set_position(x, y);

        // Add menu container separately (on top of background)
        Main.layoutManager.addChrome(this._container, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Store background reference for cleanup
        (this._container as any)._background = background;

        // Setup auto-hide on mouse leave
        this._setupAutoHide();
    }

    /**
     * Hide the snap menu
     */
    hide(): void {
        if (this._container) {
            const background = (this._container as any)._background;

            // Clear auto-hide timeout
            this._clearAutoHideTimeout();

            // Disconnect event handlers
            if (this._clickOutsideId !== null && background) {
                background.disconnect(this._clickOutsideId);
                this._clickOutsideId = null;
            }
            if (this._leaveEventId !== null && this._container) {
                this._container.disconnect(this._leaveEventId);
                this._leaveEventId = null;
            }
            if (this._enterEventId !== null && this._container) {
                this._container.disconnect(this._enterEventId);
                this._enterEventId = null;
            }

            // Remove menu container
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();

            // Remove background
            if (background) {
                Main.layoutManager.removeChrome(background);
                background.destroy();
            }

            this._container = null;
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

    /**
     * Create a group container with layout buttons positioned inside
     */
    private _createGroupContainer(
        group: SnapLayoutGroup,
        groupWidth: number,
        groupHeight: number
    ): St.Widget {
        // Create group container with fixed positioning
        const groupContainer = new St.Widget({
            style: `
                background-color: rgba(60, 60, 60, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                width: ${groupWidth}px;
                height: ${groupHeight}px;
            `,
            layout_manager: new imports.gi.Clutter.FixedLayout(),
            reactive: true,
        });

        // Sort layouts by zIndex to ensure proper rendering order
        const sortedLayouts = [...group.layouts].sort((a, b) => a.zIndex - b.zIndex);

        // Create layout buttons and position them
        for (const layout of sortedLayouts) {
            const button = this._createLayoutButtonForGroup(layout, groupWidth, groupHeight);
            this._layoutButtons.set(button, layout);
            groupContainer.add_child(button);
        }

        return groupContainer;
    }

    /**
     * Create a layout button for a group
     */
    private _createLayoutButtonForGroup(
        layout: SnapLayout,
        groupWidth: number,
        groupHeight: number
    ): St.Button {
        const margin = 3;

        // Calculate button position and size based on layout percentages
        const buttonX = layout.x * groupWidth + margin;
        const buttonY = layout.y * groupHeight + margin;
        const buttonWidth = layout.width * groupWidth - margin * 2;
        const buttonHeight = layout.height * groupHeight - margin * 2;

        const button = new St.Button({
            style_class: 'snap-layout-button',
            style: `
                background-color: rgba(80, 80, 80, 0.6);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                width: ${buttonWidth}px;
                height: ${buttonHeight}px;
                z-index: ${layout.zIndex};
            `,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Set position using set_position method (cast to any due to type definition limitations)
        (button as any).set_position(buttonX, buttonY);

        // Connect click event
        button.connect('button-press-event', () => {
            log(`[SnapMenu] Layout selected: ${layout.label}`);
            if (this._onLayoutSelected) {
                this._onLayoutSelected(layout);
            }
            this.hide();
            return true; // Clutter.EVENT_STOP
        });

        return button;
    }

    /**
     * Setup auto-hide behavior when cursor leaves menu
     */
    private _setupAutoHide(): void {
        if (!this._container) {
            return;
        }

        // Connect leave-event to start auto-hide timer
        this._leaveEventId = this._container.connect('leave-event', () => {
            log('[SnapMenu] Cursor left menu, starting auto-hide timer');
            this._startAutoHideTimeout();
            return false; // Clutter.EVENT_PROPAGATE
        });

        // Connect enter-event to cancel auto-hide timer
        this._enterEventId = this._container.connect('enter-event', () => {
            log('[SnapMenu] Cursor entered menu, canceling auto-hide timer');
            this._clearAutoHideTimeout();
            return false; // Clutter.EVENT_PROPAGATE
        });
    }

    /**
     * Start auto-hide timeout
     */
    private _startAutoHideTimeout(): void {
        // Clear existing timeout if any
        this._clearAutoHideTimeout();

        // Start new timeout
        this._autoHideTimeoutId = imports.mainloop.timeout_add(AUTO_HIDE_DELAY_MS, () => {
            log('[SnapMenu] Auto-hide timeout expired, hiding menu');
            this.hide();
            this._autoHideTimeoutId = null;
            return false; // Don't repeat
        });
    }

    /**
     * Clear auto-hide timeout
     */
    private _clearAutoHideTimeout(): void {
        if (this._autoHideTimeoutId !== null) {
            log('[SnapMenu] Clearing auto-hide timeout');
            imports.mainloop.source_remove(this._autoHideTimeoutId);
            this._autoHideTimeoutId = null;
        }
    }

    /**
     * Create cancel button
     */
    private _createCancelButton(): St.Button {
        const button = new St.Button({
            style_class: 'snap-menu-cancel-button',
            style: `
                background-color: rgba(80, 80, 80, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                padding: 8px 16px;
                margin-top: 12px;
            `,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        const label = new St.Label({
            text: 'Cancel',
            style: `
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
            `,
            x_align: 2, // CENTER
        });
        button.set_child(label);

        // Connect click event
        button.connect('button-press-event', () => {
            this.hide();
            return true; // Clutter.EVENT_STOP
        });

        return button;
    }
}
