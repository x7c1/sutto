/**
 * DragCoordinator
 *
 * Coordinates the drag lifecycle and edge detection state machine.
 * Manages MotionMonitor, EdgeTimerManager, and EdgeDetector to detect
 * when a dragged window reaches a screen edge and trigger panel display.
 */

import Meta from 'gi://Meta';
import type { EdgeDetector, Position } from '../../domain/geometry/index.js';
import type { GnomeShellMonitorProvider } from '../../infra/monitor/gnome-shell-monitor-provider.js';
import type { EdgeTimerManager } from './edge-timer-manager.js';
import type { MotionMonitor } from './motion-monitor.js';

export interface DragCoordinatorCallbacks {
  onEdgeTimerFired: () => void;
  onPanelPositionUpdate: (cursor: Position) => void;
  isPanelVisible: () => boolean;
}

export class DragCoordinator {
  private currentWindow: Meta.Window | null = null;
  private lastDraggedWindow: Meta.Window | null = null;
  private isDragging: boolean = false;
  private isAtEdge: boolean = false;

  constructor(
    private readonly motionMonitor: MotionMonitor,
    private readonly edgeTimerManager: EdgeTimerManager,
    private readonly edgeDetector: EdgeDetector,
    private readonly monitorProvider: GnomeShellMonitorProvider,
    private readonly callbacks: DragCoordinatorCallbacks
  ) {}

  onGrabOpBegin(window: Meta.Window, op: Meta.GrabOp): void {
    if (op !== Meta.GrabOp.MOVING) {
      return;
    }

    this.currentWindow = window;
    this.lastDraggedWindow = window;
    this.isDragging = true;

    this.motionMonitor.start(() => {
      if (!this.isDragging) {
        return false;
      }
      this.onMotion();
      return true;
    });
  }

  onGrabOpEnd(window: Meta.Window, op: Meta.GrabOp): void {
    if (op !== Meta.GrabOp.MOVING || window !== this.currentWindow) {
      return;
    }

    this.isDragging = false;
    this.currentWindow = null;
    this.isAtEdge = false;

    this.motionMonitor.stop();
    this.edgeTimerManager.clear();

    // Panel stays visible until user selects a layout
  }

  getCurrentWindow(): Meta.Window | null {
    return this.currentWindow || this.lastDraggedWindow;
  }

  /**
   * Set window reference directly (used for keyboard shortcut activation).
   */
  setCurrentWindow(window: Meta.Window): void {
    this.currentWindow = window;
    this.lastDraggedWindow = window;
  }

  stop(): void {
    this.motionMonitor.stop();
    this.edgeTimerManager.clear();
    this.resetState();
  }

  private resetState(): void {
    this.currentWindow = null;
    this.isDragging = false;
    this.isAtEdge = false;
  }

  private onMotion(): void {
    const cursor = this.getCursorPosition();
    const monitor = this.monitorProvider.getCurrentMonitor();
    const atEdge = monitor ? this.edgeDetector.isAtEdge(cursor, monitor.geometry) : false;

    if (atEdge && !this.isAtEdge) {
      this.isAtEdge = true;
      this.edgeTimerManager.start(() => {
        if (this.isAtEdge && this.isDragging) {
          this.callbacks.onEdgeTimerFired();
        }
      });
    } else if (!atEdge && this.isAtEdge && !this.callbacks.isPanelVisible()) {
      this.isAtEdge = false;
      this.edgeTimerManager.clear();
    }
    // Keep isAtEdge=true while panel is visible to prevent accidental dismissal

    if (this.callbacks.isPanelVisible()) {
      this.callbacks.onPanelPositionUpdate(cursor);
    }
  }

  private getCursorPosition(): Position {
    const [x, y] = global.get_pointer();
    return { x, y };
  }
}
