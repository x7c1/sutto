/// <reference path="../types/gnome-shell-42.d.ts" />

const St = imports.gi.St;
const Main = imports.ui.main;

import type { DebugConfig } from './debug-config';
import { evaluate, parse } from './layout-expression';
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

    const layoutButtons = new Map<St.Button, SnapLayout>();
    const buttonEvents: RendererEventIds['buttonEvents'] = [];

    // Add layout buttons from this group to the miniature display
    for (const layout of group.layouts) {
        const result = createLayoutButton(
            layout,
            displayWidth,
            displayHeight,
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
 * Resolve layout value (string expression) to pixels
 * @param value - Layout expression ('1/3', '50%', '100px', '50% - 10px', etc.)
 * @param containerSize - Container size in pixels (miniature display width or height)
 * @param screenSize - Optional screen size for scaling fixed pixel values
 * @returns Resolved pixel value
 */
function resolveLayoutValue(value: string, containerSize: number, screenSize?: number): number {
    const expr = parse(value);
    return evaluate(expr, containerSize, screenSize);
}

/**
 * Create a layout button
 */
function createLayoutButton(
    layout: SnapLayout,
    displayWidth: number,
    displayHeight: number,
    debugConfig: DebugConfig | null,
    onLayoutSelected: (layout: SnapLayout) => void
): {
    button: St.Button;
    enterEventId: number;
    leaveEventId: number;
    clickEventId: number;
} {
    // Get screen work area for scaling fixed pixel values
    const monitor = global.display.get_current_monitor();
    const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);

    // Calculate button position relative to miniature display
    const buttonX = resolveLayoutValue(layout.x, displayWidth, workArea.width);
    const buttonY = resolveLayoutValue(layout.y, displayHeight, workArea.height);

    // Calculate button dimensions
    const buttonWidth = calculateButtonWidth(layout, displayWidth, workArea.width);
    const buttonHeight =
        resolveLayoutValue(layout.height, displayHeight, workArea.height) - BUTTON_BORDER_WIDTH * 2;

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
 * Calculate button width based on layout width
 */
function calculateButtonWidth(
    layout: SnapLayout,
    displayWidth: number,
    screenWidth?: number
): number {
    const layoutWidth = resolveLayoutValue(layout.width, displayWidth, screenWidth);
    return layoutWidth - BUTTON_BORDER_WIDTH * 2;
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
