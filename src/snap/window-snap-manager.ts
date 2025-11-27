/// <reference path="../types/gnome-shell-42.d.ts" />

/**
 * Window Snap Manager
 *
 * Monitors window dragging and displays a snap menu when the cursor reaches screen edges.
 * Allows users to quickly snap windows to predefined positions by dropping them on menu buttons.
 */

const Meta = imports.gi.Meta;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;

import { evaluate, parse } from './layout-expression';
import { type SnapLayout, SnapMenu } from './snap-menu';

declare function log(message: string): void;

const EDGE_THRESHOLD = 10; // pixels from screen edge to trigger menu
const EDGE_DELAY = 200; // milliseconds to wait before showing menu
const MONITOR_INTERVAL = 50; // milliseconds between cursor position checks

export class WindowSnapManager {
    private _grabOpBeginId: number | null = null;
    private _grabOpEndId: number | null = null;
    private _motionId: number | null = null;
    private _currentWindow: Meta.Window | null = null;
    private _lastDraggedWindow: Meta.Window | null = null;
    private _isDragging: boolean = false;
    private _edgeTimer: number | null = null;
    private _isAtEdge: boolean = false;
    private _snapMenu: SnapMenu;

    constructor() {
        // Initialize snap menu
        this._snapMenu = new SnapMenu();
        this._snapMenu.setOnLayoutSelected((layout) => {
            this._applyLayoutToCurrentWindow(layout);
        });
    }

    /**
     * Enable the window snap manager
     */
    enable(): void {
        // Connect to grab-op-begin signal to detect window dragging
        this._grabOpBeginId = global.display.connect(
            'grab-op-begin',
            (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
                this._onGrabOpBegin(window, op);
            }
        );

        // Connect to grab-op-end signal to detect when dragging stops
        this._grabOpEndId = global.display.connect(
            'grab-op-end',
            (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
                this._onGrabOpEnd(window, op);
            }
        );
    }

    /**
     * Disable the window snap manager
     */
    disable(): void {
        // Stop motion monitoring
        this._stopMotionMonitoring();

        // Disconnect signals
        if (this._grabOpBeginId !== null) {
            global.display.disconnect(this._grabOpBeginId);
            this._grabOpBeginId = null;
        }

        if (this._grabOpEndId !== null) {
            global.display.disconnect(this._grabOpEndId);
            this._grabOpEndId = null;
        }

        // Clean up edge timer
        this._clearEdgeTimer();

        // Reset state
        this._currentWindow = null;
        this._isDragging = false;
        this._isAtEdge = false;
    }

    /**
     * Handle grab operation begin
     */
    private _onGrabOpBegin(window: Meta.Window, op: Meta.GrabOp): void {
        // Check if this is a window move operation
        if (op === Meta.GrabOp.MOVING) {
            this._currentWindow = window;
            this._lastDraggedWindow = window;
            this._isDragging = true;

            // Start monitoring cursor position
            this._startMotionMonitoring();
        }
    }

    /**
     * Handle grab operation end
     */
    private _onGrabOpEnd(window: Meta.Window, op: Meta.GrabOp): void {
        // Check if this is the end of a window move operation
        if (op === Meta.GrabOp.MOVING && window === this._currentWindow) {
            this._isDragging = false;
            this._currentWindow = null;
            this._isAtEdge = false;

            // Stop monitoring cursor position
            this._stopMotionMonitoring();

            // Clear edge timer
            this._clearEdgeTimer();

            // Keep menu visible until a button is clicked
            // (menu will be hidden when layout is applied)
        }
    }

    /**
     * Start monitoring cursor motion
     */
    private _startMotionMonitoring(): void {
        if (this._motionId !== null) {
            return; // Already monitoring
        }

        // Use GLib.timeout_add to periodically check cursor position
        this._motionId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, MONITOR_INTERVAL, () => {
            if (!this._isDragging) {
                this._motionId = null;
                return false; // Stop monitoring
            }

            this._onMotion();
            return true; // Continue monitoring
        });
    }

    /**
     * Stop monitoring cursor motion
     */
    private _stopMotionMonitoring(): void {
        if (this._motionId !== null) {
            GLib.Source.remove(this._motionId);
            this._motionId = null;
        }
    }

    /**
     * Handle cursor motion during drag
     */
    private _onMotion(): void {
        const [x, y] = this._getCursorPosition();
        const atEdge = this._isAtScreenEdge(x, y);

        if (atEdge && !this._isAtEdge) {
            // Just reached edge - start timer
            this._isAtEdge = true;
            this._startEdgeTimer();
        } else if (!atEdge && this._isAtEdge && !this._snapMenu.isVisible()) {
            // Left edge and menu is not visible - cancel timer
            this._isAtEdge = false;
            this._clearEdgeTimer();
        }
        // Note: If menu is visible, keep _isAtEdge true even if cursor is not at edge
        // This prevents the menu from disappearing when user moves cursor to menu

        // Update menu position if visible
        if (this._snapMenu.isVisible()) {
            this._snapMenu.updatePosition(x, y);
        }
    }

    /**
     * Start edge delay timer
     */
    private _startEdgeTimer(): void {
        this._clearEdgeTimer();

        this._edgeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, EDGE_DELAY, () => {
            if (this._isAtEdge && this._isDragging) {
                this._showSnapMenu();
            }
            this._edgeTimer = null;
            return false; // Don't repeat
        });
    }

    /**
     * Clear edge delay timer
     */
    private _clearEdgeTimer(): void {
        if (this._edgeTimer !== null) {
            GLib.Source.remove(this._edgeTimer);
            this._edgeTimer = null;
        }
    }

    /**
     * Get current cursor position
     */
    private _getCursorPosition(): [number, number] {
        const [x, y] = global.get_pointer();
        return [x, y];
    }

    /**
     * Check if cursor is at screen edge
     */
    private _isAtScreenEdge(x: number, y: number): boolean {
        // Get primary monitor geometry
        const monitor = global.display.get_current_monitor();
        const geometry = global.display.get_monitor_geometry(monitor);

        // Check if cursor is within EDGE_THRESHOLD of any edge
        const atLeft = x <= geometry.x + EDGE_THRESHOLD;
        const atRight = x >= geometry.x + geometry.width - EDGE_THRESHOLD;
        const atTop = y <= geometry.y + EDGE_THRESHOLD;
        const atBottom = y >= geometry.y + geometry.height - EDGE_THRESHOLD;

        return atLeft || atRight || atTop || atBottom;
    }

    /**
     * Show snap menu at cursor position
     */
    private _showSnapMenu(): void {
        if (this._snapMenu.isVisible()) {
            return; // Already visible
        }

        const [x, y] = this._getCursorPosition();
        this._snapMenu.show(x, y);
    }

    /**
     * Apply layout to currently dragged window (called when menu button is clicked)
     */
    private _applyLayoutToCurrentWindow(layout: SnapLayout): void {
        log(`[WindowSnapManager] Apply layout: ${layout.label}`);

        // Use lastDraggedWindow since currentWindow might be null if drag just ended
        const targetWindow = this._currentWindow || this._lastDraggedWindow;

        if (!targetWindow) {
            log('[WindowSnapManager] No window to apply layout to');
            return;
        }

        // Get work area (excludes panels, top bar, etc.)
        const monitor = global.display.get_current_monitor();
        const workArea = Main.layoutManager.getWorkAreaForMonitor(monitor);

        // Helper to resolve layout values
        const resolve = (value: string, containerSize: number): number => {
            const expr = parse(value);
            return evaluate(expr, containerSize);
        };

        // Calculate window position and size based on layout
        const x = workArea.x + resolve(layout.x, workArea.width);
        const y = workArea.y + resolve(layout.y, workArea.height);
        const width = resolve(layout.width, workArea.width);
        const height = resolve(layout.height, workArea.height);

        log(
            `[WindowSnapManager] Moving window to x=${x}, y=${y}, w=${width}, h=${height} (work area: ${workArea.x},${workArea.y} ${workArea.width}x${workArea.height})`
        );

        // Unmaximize window if maximized
        if (targetWindow.get_maximized()) {
            log('[WindowSnapManager] Unmaximizing window');
            targetWindow.unmaximize(3); // Both horizontally and vertically
        }

        // Move and resize window
        targetWindow.move_resize_frame(false, x, y, width, height);
        log('[WindowSnapManager] Window moved');
    }
}
