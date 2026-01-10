/**
 * DragSignalHandler
 *
 * Handles window drag signal connections and disconnections.
 * Manages grab-op-begin and grab-op-end signals.
 */

import type Meta from 'gi://Meta';

export interface DragCallbacks {
  onDragBegin: (window: Meta.Window, op: Meta.GrabOp) => void;
  onDragEnd: (window: Meta.Window, op: Meta.GrabOp) => void;
}

export class DragSignalHandler {
  private grabOpBeginId: number | null = null;
  private grabOpEndId: number | null = null;

  /**
   * Connect window drag signals
   */
  connect(callbacks: DragCallbacks): void {
    // Connect to grab-op-begin signal to detect window dragging
    this.grabOpBeginId = global.display.connect(
      'grab-op-begin',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        callbacks.onDragBegin(window, op);
      }
    );

    // Connect to grab-op-end signal to detect when dragging stops
    this.grabOpEndId = global.display.connect(
      'grab-op-end',
      (_display: Meta.Display, window: Meta.Window, op: Meta.GrabOp) => {
        callbacks.onDragEnd(window, op);
      }
    );
  }

  /**
   * Disconnect window drag signals
   */
  disconnect(): void {
    if (this.grabOpBeginId !== null) {
      global.display.disconnect(this.grabOpBeginId);
      this.grabOpBeginId = null;
    }

    if (this.grabOpEndId !== null) {
      global.display.disconnect(this.grabOpEndId);
      this.grabOpEndId = null;
    }
  }
}
