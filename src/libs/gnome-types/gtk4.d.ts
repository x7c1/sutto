// GTK4 type definitions for GNOME Shell extension preferences

declare namespace Gtk {
  enum Align {
    FILL = 0,
    START = 1,
    END = 2,
    CENTER = 3,
    BASELINE = 4,
  }

  enum ButtonsType {
    NONE = 0,
    OK = 1,
    CLOSE = 2,
    CANCEL = 3,
    YES_NO = 4,
    OK_CANCEL = 5,
  }

  interface WidgetProperties {
    valign?: Align;
    halign?: Align;
    visible?: boolean;
    sensitive?: boolean;
  }

  interface ButtonProperties extends WidgetProperties {
    label?: string;
    has_frame?: boolean;
    icon_name?: string;
    tooltip_text?: string;
  }

  interface LabelProperties extends WidgetProperties {
    label?: string;
    use_markup?: boolean;
    xalign?: number;
    yalign?: number;
  }

  interface BoxProperties extends WidgetProperties {
    spacing?: number;
    homogeneous?: boolean;
    orientation?: Orientation;
  }

  interface MessageDialogProperties extends WidgetProperties {
    transient_for?: Window;
    modal?: boolean;
    buttons?: ButtonsType;
    text?: string;
    secondary_text?: string;
  }

  enum Orientation {
    HORIZONTAL = 0,
    VERTICAL = 1,
  }

  class Widget {
    get_root(): Window | null;

    // biome-ignore lint: noConfusingVoidType
    connect(signal: string, callback: (...args: any[]) => boolean | void): number;
    disconnect(id: number): void;
  }

  class Button extends Widget {
    constructor(properties?: ButtonProperties);
    set_label(label: string): void;
    get_label(): string;
    set_child(child: Widget | null): void;
  }

  class Label extends Widget {
    constructor(properties?: LabelProperties);
    set_label(label: string): void;
    get_label(): string;
  }

  class Box extends Widget {
    constructor(properties?: BoxProperties);
    append(child: Widget): void;
    remove(child: Widget): void;
  }

  interface WindowProperties extends WidgetProperties {
    transient_for?: Window;
    modal?: boolean;
    title?: string;
  }

  class Window extends Widget {
    constructor(properties?: WindowProperties);
    present(): void;
    close(): void;
    set_child(child: Widget | null): void;
    add_controller(controller: EventController): void;
  }

  class MessageDialog extends Window {
    constructor(properties?: MessageDialogProperties);
    add_controller(controller: EventController): void;
  }

  class EventController {
    constructor();
    connect(signal: string, callback: (...args: any[]) => boolean): number;
    disconnect(id: number): void;
  }

  class EventControllerKey extends EventController {
    constructor();
  }

  // Accelerator functions
  function accelerator_name(keyval: number, mask: number): string;
  function accelerator_parse(accelerator: string): [number, number];
  function accelerator_get_default_mod_mask(): number;
}
