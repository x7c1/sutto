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

// Constants
const AUTO_HIDE_DELAY_MS = 500; // Time to wait before hiding menu when cursor leaves
const MINIATURE_DISPLAY_WIDTH = 300; // Fixed width for miniature displays
const MENU_PADDING = 12; // Padding around menu content
const DISPLAY_SPACING = 12; // Spacing between miniature displays
const BUTTON_BORDER_WIDTH = 1; // Border width for layout buttons
const FOOTER_MARGIN_TOP = 12; // Margin above footer

// Colors
const MENU_BG_COLOR = 'rgba(40, 40, 40, 0.95)';
const MENU_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
const DISPLAY_BG_COLOR = 'rgba(20, 20, 20, 0.9)';
const BUTTON_BG_COLOR = 'rgba(80, 80, 80, 0.6)';
const BUTTON_BG_COLOR_HOVER = 'rgba(120, 120, 120, 0.8)';
const BUTTON_BORDER_COLOR = 'rgba(255, 255, 255, 0.3)';
const BUTTON_BORDER_COLOR_HOVER = 'rgba(255, 255, 255, 0.6)';
const FOOTER_TEXT_COLOR = 'rgba(255, 255, 255, 0.5)';

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
    private _background: St.BoxLayout | null = null;
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
            {
                name: 'Center Half',
                layouts: [
                    {
                        label: 'Center Half',
                        x: 0.25,
                        y: 0,
                        width: 0.5,
                        height: 1,
                        zIndex: 0,
                    },
                ],
            },
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

        // Miniature display dimensions
        const miniatureDisplayHeight = MINIATURE_DISPLAY_WIDTH * aspectRatio;

        // Create main container with vertical BoxLayout
        const container = new St.BoxLayout({
            style_class: 'snap-menu',
            style: `
                background-color: ${MENU_BG_COLOR};
                border: 2px solid ${MENU_BORDER_COLOR};
                border-radius: 8px;
                padding: ${MENU_PADDING}px;
            `,
            vertical: true, // Vertical layout: displays on top, footer on bottom
            visible: true,
            reactive: true,
            can_focus: true,
            track_hover: true,
        });
        this._container = container;

        // Create and add displays container
        const displaysContainer = this._createDisplaysContainer(
            MINIATURE_DISPLAY_WIDTH,
            miniatureDisplayHeight
        );
        container.add_child(displaysContainer);

        // Add footer
        const footer = this._createFooter();
        container.add_child(footer);

        // Create and setup background
        this._background = this._createBackground();

        // Position menu at cursor
        container.set_position(x, y);

        // Add menu container separately (on top of background)
        Main.layoutManager.addChrome(container, {
            affectsInputRegion: true,
            trackFullscreen: false,
        });

        // Setup auto-hide on mouse leave
        this._setupAutoHide();
    }

    /**
     * Hide the snap menu
     */
    hide(): void {
        if (this._container) {
            // Clear auto-hide timeout
            this._clearAutoHideTimeout();

            // Disconnect event handlers
            if (this._clickOutsideId !== null && this._background) {
                this._background.disconnect(this._clickOutsideId);
                this._clickOutsideId = null;
            }
            if (this._leaveEventId !== null) {
                this._container.disconnect(this._leaveEventId);
                this._leaveEventId = null;
            }
            if (this._enterEventId !== null) {
                this._container.disconnect(this._enterEventId);
                this._enterEventId = null;
            }

            // Remove menu container
            Main.layoutManager.removeChrome(this._container);
            this._container.destroy();

            // Remove background
            if (this._background) {
                Main.layoutManager.removeChrome(this._background);
                this._background.destroy();
            }

            this._container = null;
            this._background = null;
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
     * Create footer with app name
     */
    private _createFooter(): St.Label {
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
     * Create background overlay to capture clicks outside menu
     */
    private _createBackground(): St.BoxLayout {
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

        return background;
    }

    /**
     * Create displays container with miniature displays
     */
    private _createDisplaysContainer(displayWidth: number, displayHeight: number): St.BoxLayout {
        const displaysContainer = new St.BoxLayout({
            style_class: 'snap-displays-container',
            vertical: true, // Vertical layout: stack miniature displays
            x_expand: false,
            y_expand: false,
        });

        // Create one miniature display for each layout group
        for (const group of this._layoutGroups) {
            const miniatureDisplay = this._createMiniatureDisplay(
                group,
                displayWidth,
                displayHeight
            );
            displaysContainer.add_child(miniatureDisplay);
        }

        return displaysContainer;
    }

    /**
     * Create a miniature display with light black background for a specific group
     */
    private _createMiniatureDisplay(
        group: SnapLayoutGroup,
        displayWidth: number,
        displayHeight: number
    ): St.Widget {
        const miniatureDisplay = new St.Widget({
            style_class: 'snap-miniature-display',
            style: `
                background-color: ${DISPLAY_BG_COLOR};
                width: ${displayWidth}px;
                height: ${displayHeight}px;
                border-radius: 4px;
                margin-bottom: ${DISPLAY_SPACING}px;
            `,
            layout_manager: new imports.gi.Clutter.FixedLayout(),
            reactive: true,
        });

        // Sort layouts by x position for proper width calculation
        const sortedByX = [...group.layouts].sort((a, b) => a.x - b.x);

        // Build a map of next layouts for efficient lookup
        const nextLayoutMap = this._buildNextLayoutMap(sortedByX);

        // Add layout buttons from this group to the miniature display
        for (const layout of sortedByX) {
            const nextLayout = nextLayoutMap.get(layout);
            const button = this._createLayoutButton(
                layout,
                displayWidth,
                displayHeight,
                nextLayout
            );
            this._layoutButtons.set(button, layout);
            miniatureDisplay.add_child(button);
        }

        return miniatureDisplay;
    }

    /**
     * Build a map of each layout to its next layout on the same row
     */
    private _buildNextLayoutMap(
        sortedLayouts: SnapLayout[]
    ): Map<SnapLayout, SnapLayout | undefined> {
        const nextLayoutMap = new Map<SnapLayout, SnapLayout | undefined>();

        for (let i = 0; i < sortedLayouts.length; i++) {
            const layout = sortedLayouts[i];
            // Find the next layout to the right on the same row (same y coordinate)
            const nextLayout = sortedLayouts
                .slice(i + 1)
                .find((l) => l.y === layout.y && l.x > layout.x);
            nextLayoutMap.set(layout, nextLayout);
        }

        return nextLayoutMap;
    }

    /**
     * Create a layout button
     */
    private _createLayoutButton(
        layout: SnapLayout,
        displayWidth: number,
        displayHeight: number,
        nextLayout: SnapLayout | undefined
    ): St.Button {
        // Calculate button position relative to miniature display
        const buttonX = Math.floor(layout.x * displayWidth);
        const buttonY = Math.floor(layout.y * displayHeight);

        // Calculate button dimensions
        const buttonWidth = this._calculateButtonWidth(layout, displayWidth, nextLayout, buttonX);
        const buttonHeight = Math.floor(layout.height * displayHeight) - BUTTON_BORDER_WIDTH * 2;

        // Create button with initial style
        const button = new St.Button({
            style_class: 'snap-layout-button',
            style: this._getButtonStyle(false, buttonWidth, buttonHeight, layout.zIndex),
            reactive: true,
            can_focus: true,
            track_hover: true,
        });

        // Set position
        button.set_position(buttonX, buttonY);

        // Add hover effect
        button.connect('enter-event', () => {
            button.set_style(this._getButtonStyle(true, buttonWidth, buttonHeight, layout.zIndex));
            return false; // Clutter.EVENT_PROPAGATE
        });

        button.connect('leave-event', () => {
            button.set_style(this._getButtonStyle(false, buttonWidth, buttonHeight, layout.zIndex));
            return false; // Clutter.EVENT_PROPAGATE
        });

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
     * Calculate button width based on layout and next layout
     */
    private _calculateButtonWidth(
        layout: SnapLayout,
        displayWidth: number,
        nextLayout: SnapLayout | undefined,
        buttonX: number
    ): number {
        if (nextLayout) {
            // Stretch to the start of next layout
            const nextX = Math.floor(nextLayout.x * displayWidth);
            return nextX - buttonX - BUTTON_BORDER_WIDTH * 2;
        }

        // No next layout: check if this layout extends to edge
        const layoutEndX = Math.floor((layout.x + layout.width) * displayWidth);
        if (layoutEndX === displayWidth) {
            // Layout extends to edge, stretch to edge
            return displayWidth - buttonX - BUTTON_BORDER_WIDTH * 2;
        }

        // Layout doesn't extend to edge, use its own width
        return Math.floor(layout.width * displayWidth) - BUTTON_BORDER_WIDTH * 2;
    }

    /**
     * Get button style based on hover state
     */
    private _getButtonStyle(
        isHovered: boolean,
        buttonWidth: number,
        buttonHeight: number,
        zIndex: number
    ): string {
        const bgColor = isHovered ? BUTTON_BG_COLOR_HOVER : BUTTON_BG_COLOR;
        const borderColor = isHovered ? BUTTON_BORDER_COLOR_HOVER : BUTTON_BORDER_COLOR;

        return `
            background-color: ${bgColor};
            border: ${BUTTON_BORDER_WIDTH}px solid ${borderColor};
            border-radius: 2px;
            width: ${buttonWidth}px;
            height: ${buttonHeight}px;
            margin: 0;
            padding: 0;
            z-index: ${zIndex};
        `;
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
}
