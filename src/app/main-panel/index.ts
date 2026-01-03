/**
 * Main Panel - With layout buttons for Step 5
 * Displays layout buttons that snap windows to predefined positions
 */

import St from 'gi://St';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type {Layout} from '../types/index.js';
import {parse, evaluate} from '../layout-expression/index.js';

export class MainPanel {
  private panel: St.BoxLayout | null = null;
  private buttons: St.Button[] = [];
  private currentWindow: Meta.Window | null = null;
  private onLayoutSelected: ((layout: Layout) => void) | null = null;

  /**
   * Set the current window being dragged
   */
  setCurrentWindow(window: Meta.Window | null): void {
    this.currentWindow = window;
  }

  /**
   * Set callback for when a layout is selected
   */
  setOnLayoutSelected(callback: (layout: Layout) => void): void {
    this.onLayoutSelected = callback;
  }

  /**
   * Show the panel at a specific position
   */
  show(x?: number, y?: number): void {
    if (this.panel) {
      console.log('[MainPanel] Panel already exists');
      return;
    }

    console.log('[MainPanel] Creating panel...');

    // Create panel container
    this.panel = new St.BoxLayout({
      style_class: 'snap-main-panel',
      vertical: false,
      reactive: true,
      style: 'background-color: rgba(0, 0, 0, 0.8); padding: 10px; border-radius: 8px;',
    });

    // Create layout buttons
    this.createLayoutButtons();

    // Add panel to UI group
    (Main.layoutManager as any).addChrome(this.panel, {
      affectsInputRegion: true,
    });

    // Position panel
    const monitor = (Main.layoutManager as any).primaryMonitor;
    const panelX = x !== undefined ? x - 100 : monitor.x + Math.floor(monitor.width / 2) - 100;
    const panelY = y !== undefined ? y : monitor.y + Math.floor(monitor.height / 2);

    this.panel.set_position(panelX, panelY);

    console.log('[MainPanel] Panel created and positioned at', panelX, panelY);
  }

  /**
   * Create layout buttons
   */
  private createLayoutButtons(): void {
    if (!this.panel) return;

    // Define simple layouts
    const layouts: Layout[] = [
      {
        id: 'left-half',
        hash: 'left-half',
        label: 'Left Half',
        x: '0/1',
        y: '0/1',
        width: '1/2',
        height: '1/1',
      },
      {
        id: 'right-half',
        hash: 'right-half',
        label: 'Right Half',
        x: '1/2',
        y: '0/1',
        width: '1/2',
        height: '1/1',
      },
    ];

    for (const layout of layouts) {
      const button = new St.Button({
        label: layout.label,
        style_class: 'button',
        reactive: true,
        can_focus: true,
        track_hover: true,
        style: 'background-color: rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 4px; color: white; margin-right: 8px;',
      });

      button.connect('clicked', () => {
        console.log(`[MainPanel] Layout button clicked: ${layout.label}`);
        this.applyLayout(layout);
      });

      this.panel!.add_child(button);
      this.buttons.push(button);
    }
  }

  /**
   * Apply layout to current window
   */
  private applyLayout(layout: Layout): void {
    if (!this.currentWindow) {
      console.log('[MainPanel] No current window to apply layout to');
      return;
    }

    console.log(`[MainPanel] Applying layout: ${layout.label}`);

    const monitor = this.currentWindow.get_monitor();
    const workArea = this.currentWindow.get_work_area_for_monitor(monitor);

    // Parse and evaluate layout expressions
    const x = Math.round(evaluate(parse(layout.x), workArea.width)) + workArea.x;
    const y = Math.round(evaluate(parse(layout.y), workArea.height)) + workArea.y;
    const width = Math.round(evaluate(parse(layout.width), workArea.width));
    const height = Math.round(evaluate(parse(layout.height), workArea.height));

    console.log(`[MainPanel] Moving window to: x=${x}, y=${y}, w=${width}, h=${height}`);

    // Unmaximize if needed
    if (this.currentWindow.get_maximized()) {
      this.currentWindow.unmaximize(Meta.MaximizeFlags.BOTH);
    }

    // Move and resize window
    this.currentWindow.move_resize_frame(true, x, y, width, height);

    // Hide panel after applying layout
    this.hide();

    // Notify callback
    if (this.onLayoutSelected) {
      this.onLayoutSelected(layout);
    }
  }

  /**
   * Hide and destroy the panel
   */
  hide(): void {
    if (!this.panel) {
      return;
    }

    console.log('[MainPanel] Hiding panel...');

    // Remove from UI
    (Main.layoutManager as any).removeChrome(this.panel);

    // Destroy buttons
    for (const button of this.buttons) {
      button.destroy();
    }
    this.buttons = [];

    // Destroy panel
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }

    console.log('[MainPanel] Panel destroyed');
  }

  /**
   * Check if panel is currently visible
   */
  isVisible(): boolean {
    return this.panel !== null;
  }
}
