/// <reference path="../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Main = imports.ui.main;

import type { DebugConfig } from './debug-config';
import {
    BUTTON_BG_COLOR,
    BUTTON_BG_COLOR_HOVER,
    BUTTON_BORDER_COLOR,
    BUTTON_BORDER_COLOR_HOVER,
    BUTTON_BORDER_WIDTH,
    DISPLAY_BG_COLOR,
    DISPLAY_SPACING,
    FOOTER_MARGIN_TOP,
    FOOTER_TEXT_COLOR,
} from './snap-menu-constants';
import type { SnapLayout, SnapLayoutGroup } from './snap-menu-types';

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
    layoutButtons: Map<St.Button, SnapLayout>;
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
    layoutGroups: SnapLayoutGroup[],
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: SnapLayout) => void
): {
    displaysContainer: St.BoxLayout;
    layoutButtons: Map<St.Button, SnapLayout>;
    buttonEvents: RendererEventIds['buttonEvents'];
} {
    const displaysContainer = new St.BoxLayout({
        style_class: 'snap-displays-container',
        vertical: true, // Vertical layout: stack miniature displays
        x_expand: false,
        y_expand: false,
    });

    const layoutButtons = new Map<St.Button, SnapLayout>();
    const buttonEvents: RendererEventIds['buttonEvents'] = [];

    // Create one miniature display for each layout group
    for (const group of layoutGroups) {
        const result = createMiniatureDisplay(
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
 * Create a miniature display with light black background for a specific group
 */
function createMiniatureDisplay(
    group: SnapLayoutGroup,
    displayWidth: number,
    displayHeight: number,
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: SnapLayout) => void
): {
    miniatureDisplay: St.Widget;
    layoutButtons: Map<St.Button, SnapLayout>;
    buttonEvents: RendererEventIds['buttonEvents'];
} {
    // Apply debug configuration
    const showBackground = !debugConfig || debugConfig.showMiniatureDisplayBackground;
    const showBorder = debugConfig?.showMiniatureDisplayBorder;

    let style = `
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        border-radius: 4px;
        margin-bottom: ${DISPLAY_SPACING}px;
    `;

    if (showBackground) {
        style += `background-color: ${DISPLAY_BG_COLOR};`;
    }

    if (showBorder) {
        style += `border: 2px solid rgba(255, 0, 0, 0.5);`; // Red border for debugging
    }

    const miniatureDisplay = new St.Widget({
        style_class: 'snap-miniature-display',
        style: style,
        layout_manager: new imports.gi.Clutter.FixedLayout(),
        reactive: true,
    });

    // Sort layouts by x position for proper width calculation
    const sortedByX = [...group.layouts].sort((a, b) => a.x - b.x);

    // Build a map of next layouts for efficient lookup
    const nextLayoutMap = buildNextLayoutMap(sortedByX);

    const layoutButtons = new Map<St.Button, SnapLayout>();
    const buttonEvents: RendererEventIds['buttonEvents'] = [];

    // Add layout buttons from this group to the miniature display
    for (const layout of sortedByX) {
        const nextLayout = nextLayoutMap.get(layout);
        const result = createLayoutButton(
            layout,
            displayWidth,
            displayHeight,
            nextLayout,
            debugConfig,
            onLayoutSelected
        );
        layoutButtons.set(result.button, layout);
        miniatureDisplay.add_child(result.button);
        buttonEvents.push({
            button: result.button,
            enterEventId: result.enterEventId,
            leaveEventId: result.leaveEventId,
            clickEventId: result.clickEventId,
        });
    }

    // Add spacing guide labels if enabled
    if (debugConfig?.showSpacingGuides) {
        // Add group name label at the top
        const groupLabel = new St.Label({
            text: group.name,
            style: `
                color: rgba(0, 200, 255, 0.9);
                font-size: 9px;
                background-color: rgba(0, 0, 0, 0.8);
                padding: 2px 4px;
                border-radius: 2px;
            `,
        });
        groupLabel.set_position(4, 4);
        miniatureDisplay.add_child(groupLabel);

        // Add spacing info label at the bottom
        const spacingLabel = new St.Label({
            text: `Spacing: ${DISPLAY_SPACING}px`,
            style: `
                color: rgba(255, 255, 0, 0.9);
                font-size: 8px;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 2px 4px;
                border-radius: 2px;
            `,
        });
        spacingLabel.set_position(4, displayHeight - 20);
        miniatureDisplay.add_child(spacingLabel);
    }

    return { miniatureDisplay, layoutButtons, buttonEvents };
}

/**
 * Build a map of each layout to its next layout on the same row
 */
function buildNextLayoutMap(sortedLayouts: SnapLayout[]): Map<SnapLayout, SnapLayout | undefined> {
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
function createLayoutButton(
    layout: SnapLayout,
    displayWidth: number,
    displayHeight: number,
    nextLayout: SnapLayout | undefined,
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: SnapLayout) => void
): {
    button: St.Button;
    enterEventId: number;
    leaveEventId: number;
    clickEventId: number;
} {
    // Calculate button position relative to miniature display
    const buttonX = Math.floor(layout.x * displayWidth);
    const buttonY = Math.floor(layout.y * displayHeight);

    // Calculate button dimensions
    const buttonWidth = calculateButtonWidth(layout, displayWidth, nextLayout, buttonX);
    const buttonHeight = Math.floor(layout.height * displayHeight) - BUTTON_BORDER_WIDTH * 2;

    // Create button with initial style
    const button = new St.Button({
        style_class: 'snap-layout-button',
        style: getButtonStyle(false, buttonWidth, buttonHeight, layout.zIndex, debugConfig),
        reactive: true,
        can_focus: true,
        track_hover: true,
    });

    // Set position
    button.set_position(buttonX, buttonY);

    // Add size label if debug mode is enabled
    if (debugConfig?.showSizeLabels) {
        const sizeLabel = new St.Label({
            text: `${buttonWidth}×${buttonHeight}`,
            style: `
                color: rgba(255, 255, 255, 0.9);
                font-size: 10px;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 2px 4px;
                border-radius: 2px;
            `,
        });
        button.set_child(sizeLabel);
    }

    // Add hover effect
    const enterEventId = button.connect('enter-event', () => {
        button.set_style(
            getButtonStyle(true, buttonWidth, buttonHeight, layout.zIndex, debugConfig)
        );
        return false; // Clutter.EVENT_PROPAGATE
    });

    const leaveEventId = button.connect('leave-event', () => {
        button.set_style(
            getButtonStyle(false, buttonWidth, buttonHeight, layout.zIndex, debugConfig)
        );
        return false; // Clutter.EVENT_PROPAGATE
    });

    // Connect click event
    const clickEventId = button.connect('button-press-event', () => {
        log(`[SnapMenu] Layout selected: ${layout.label}`);
        onLayoutSelected(layout);
        return true; // Clutter.EVENT_STOP
    });

    return { button, enterEventId, leaveEventId, clickEventId };
}

/**
 * Calculate button width based on layout and next layout
 */
function calculateButtonWidth(
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
function getButtonStyle(
    isHovered: boolean,
    buttonWidth: number,
    buttonHeight: number,
    zIndex: number,
    debugConfig: DebugConfig | null
): string {
    const bgColor = isHovered ? BUTTON_BG_COLOR_HOVER : BUTTON_BG_COLOR;
    const borderColor = isHovered ? BUTTON_BORDER_COLOR_HOVER : BUTTON_BORDER_COLOR;

    // Apply debug configuration for button borders
    const showBorders = !debugConfig || debugConfig.showButtonBorders;
    const borderStyle = showBorders
        ? `border: ${BUTTON_BORDER_WIDTH}px solid ${borderColor};`
        : 'border: none;';

    return `
        background-color: ${bgColor};
        ${borderStyle}
        border-radius: 2px;
        width: ${buttonWidth}px;
        height: ${buttonHeight}px;
        margin: 0;
        padding: 0;
        z-index: ${zIndex};
    `;
}
