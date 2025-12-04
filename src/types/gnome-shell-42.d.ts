/// <reference path="./glib.d.ts" />
/// <reference path="./gio.d.ts" />

/**
 * Type definitions for GNOME Shell 42 (GJS imports API)
 *
 * These are custom type definitions for GNOME Shell 42, which uses the legacy
 * `imports` module system. The types are based on the official @girs packages
 * but adapted for the imports API.
 *
 * ## Why custom type definitions?
 *
 * GNOME Shell 42 uses the legacy `imports` API, but official @girs type
 * definitions only support GNOME Shell 45+ with ESM imports. There is no
 * @girs/gnome-shell@42 package available.
 *
 * ## How to add new types:
 *
 * 1. Check installed @girs packages in node_modules/@girs/
 *    Example: node_modules/@girs/st-1.0/st-1.0.d.ts
 *
 * 2. Search for the type you need:
 *    ```bash
 *    grep "class Button" node_modules/@girs/st-1.0/st-1.0.d.ts
 *    grep "interface Button" node_modules/@girs/st-1.0/st-1.0.d.ts
 *    ```
 *
 * 3. Extract the relevant interface/class definition:
 *    - Constructor properties
 *    - Methods you actually use
 *    - Properties you access
 *
 * 4. Add it to the appropriate section below:
 *    - St types: from @girs/st-1.0
 *    - Clutter types: from @girs/clutter-10
 *    - GNOME Shell UI: from @girs/gnome-shell (if available for reference)
 *
 * 5. Add to the `imports` declaration at the bottom
 *
 * Note: Only add types you actually use. Don't copy entire definitions.
 */

// ============================================================================
// Meta Types (from @girs/meta)
// ============================================================================

declare namespace Meta {
  enum GrabOp {
    NONE = 0,
    MOVING = 1,
    RESIZING_NW = 36865,
    RESIZING_N = 32769,
    RESIZING_NE = 40961,
    RESIZING_E = 8193,
    RESIZING_SE = 40961,
    RESIZING_S = 16385,
    RESIZING_SW = 20481,
    RESIZING_W = 4097,
  }

  interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface RectangleConstructor {
    new (props: { x: number; y: number; width: number; height: number }): Rectangle;
  }

  interface Window {
    get_frame_rect(): Rectangle;
    move_resize_frame(user_op: boolean, x: number, y: number, width: number, height: number): void;
    unmaximize(directions: number): void;
    is_fullscreen(): boolean;
    get_maximized(): number;
    get_wm_class(): string | null;
    get_id(): number;
    get_title(): string;
  }

  interface Display {
    connect(
      signal: string,
      callback: (display: Display, window: Window, op: GrabOp) => void
    ): number;
    disconnect(id: number): void;
    get_monitor_geometry(monitor: number): Rectangle;
    get_n_monitors(): number;
    get_current_monitor(): number;
    get_monitor_index_for_rect(rect: Rectangle): number;
  }
}

// ============================================================================
// GLib Types
// ============================================================================

declare const GLib: {
  PRIORITY_DEFAULT: number;
  timeout_add(priority: number, interval: number, callback: () => boolean): number;
  Source: {
    remove(id: number): boolean;
  };
};

// ============================================================================
// Shell Types
// ============================================================================

declare namespace Shell {
  interface Global {
    get_pointer(): [number, number, number];
    display: Meta.Display;
    get_current_time(): number;
    stage: Clutter.Actor;
    screen_width: number;
    screen_height: number;
  }
}

// ============================================================================
// Clutter Types (from @girs/clutter-10)
// ============================================================================

declare namespace Clutter {
  interface Actor {
    destroy(): void;
    connect(signal: string, callback: (...args: any[]) => boolean): number;
    disconnect(id: number): void;
    get_parent(): Clutter.Actor | null;
    add_child(child: Clutter.Actor): void;
    remove_child(child: Clutter.Actor): void;
    get_transformed_position(): [number, number];
    get_transformed_size(): [number, number];
  }

  enum ActorAlign {
    FILL = 0,
    START = 1,
    CENTER = 2,
    END = 3,
  }
}

// ============================================================================
// St (Shell Toolkit) Types (from @girs/st-1.0)
// ============================================================================

declare namespace St {
  interface LabelConstructorProperties {
    text?: string;
    style_class?: string;
    style?: string;
    x_align?: Clutter.ActorAlign;
    y_align?: Clutter.ActorAlign;
    x_expand?: boolean;
    y_expand?: boolean;
    can_focus?: boolean;
    track_hover?: boolean;
    reactive?: boolean;
    visible?: boolean;
  }

  interface Label extends Clutter.Actor {
    text: string;
    clutter_text: Clutter.Actor;

    get_text(): string;
    set_text(text: string): void;
    get_clutter_text(): Clutter.Actor;
    destroy(): void;
  }

  interface LabelConstructor {
    new (props?: LabelConstructorProperties): Label;
  }

  interface ButtonConstructorProperties {
    style_class?: string;
    style?: string;
    reactive?: boolean;
    can_focus?: boolean;
    track_hover?: boolean;
    x_align?: Clutter.ActorAlign;
    y_align?: Clutter.ActorAlign;
    x_expand?: boolean;
    y_expand?: boolean;
    visible?: boolean;
  }

  interface Button extends Clutter.Actor {
    set_child(child: Clutter.Actor): void;
    set_position(x: number, y: number): void;
    set_style(style: string): void;
    connect(signal: string, callback: () => boolean): number;
    destroy(): void;
  }

  interface ButtonConstructor {
    new (props?: ButtonConstructorProperties): Button;
  }

  interface BoxLayoutConstructorProperties {
    style_class?: string;
    style?: string;
    vertical?: boolean;
    x_align?: Clutter.ActorAlign;
    y_align?: Clutter.ActorAlign;
    x_expand?: boolean;
    y_expand?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    visible?: boolean;
    reactive?: boolean;
    can_focus?: boolean;
    track_hover?: boolean;
  }

  interface BoxLayout extends Clutter.Actor {
    add_child(child: Clutter.Actor): void;
    remove_child(child: Clutter.Actor): void;
    remove_all_children(): void;
    set_position(x: number, y: number): void;
    destroy(): void;
  }

  interface BoxLayoutConstructor {
    new (props?: BoxLayoutConstructorProperties): BoxLayout;
  }

  interface WidgetConstructorProperties {
    style_class?: string;
    style?: string;
    layout_manager?: Clutter.LayoutManager;
    x_align?: Clutter.ActorAlign;
    y_align?: Clutter.ActorAlign;
    x_expand?: boolean;
    y_expand?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    visible?: boolean;
    reactive?: boolean;
    can_focus?: boolean;
    track_hover?: boolean;
  }

  interface Widget extends Clutter.Actor {
    add_child(child: Clutter.Actor): void;
    remove_child(child: Clutter.Actor): void;
    set_position(x: number, y: number): void;
    set_style(style: string): void;
    destroy(): void;
  }

  interface WidgetConstructor {
    new (props?: WidgetConstructorProperties): Widget;
  }
}

// ============================================================================
// GNOME Shell UI Types
// ============================================================================

declare namespace UI {
  interface Panel {
    _leftBox: any;
    _centerBox: any;
    _rightBox: {
      insert_child_at_index(child: Clutter.Actor, index: number): void;
      remove_child(child: Clutter.Actor): void;
    };
  }

  interface LayoutManager {
    addChrome(
      actor: Clutter.Actor,
      options?: {
        affectsInputRegion?: boolean;
        trackFullscreen?: boolean;
      }
    ): void;
    removeChrome(actor: Clutter.Actor): void;
    getWorkAreaForMonitor(monitor: number): Meta.Rectangle;
  }

  interface Main {
    panel: Panel;
    layoutManager: LayoutManager;
  }
}

// ============================================================================
// GJS imports API for GNOME Shell 42
// ============================================================================

declare const imports: {
  gi: {
    St: {
      Label: St.LabelConstructor;
      Button: St.ButtonConstructor;
      BoxLayout: St.BoxLayoutConstructor;
      Widget: St.WidgetConstructor;
      [key: string]: any;
    };
    Clutter: {
      ActorAlign: typeof Clutter.ActorAlign;
      [key: string]: any;
    };
    Meta: {
      GrabOp: typeof Meta.GrabOp;
      Rectangle: Meta.RectangleConstructor;
      [key: string]: any;
    };
    [key: string]: any;
  };
  ui: {
    main: UI.Main;
    [key: string]: any;
  };
  [key: string]: any;
};

declare const global: Shell.Global;
