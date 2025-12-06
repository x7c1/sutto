// Libadwaita type definitions for GNOME Shell extension preferences

declare namespace Adw {
  interface PreferencesWindowProperties {
    title?: string;
    default_width?: number;
    default_height?: number;
  }

  interface PreferencesPageProperties {
    title?: string;
    icon_name?: string;
  }

  interface PreferencesGroupProperties {
    title?: string;
    description?: string;
  }

  interface ActionRowProperties {
    title?: string;
    subtitle?: string;
    activatable?: boolean;
  }

  class PreferencesWindow extends Gtk.Window {
    constructor(properties?: PreferencesWindowProperties);
    add(page: PreferencesPage): void;
    present(): void;
  }

  class PreferencesPage extends Gtk.Widget {
    constructor(properties?: PreferencesPageProperties);
    add(group: PreferencesGroup): void;
  }

  class PreferencesGroup extends Gtk.Widget {
    constructor(properties?: PreferencesGroupProperties);
    add(row: ActionRow): void;
    get_root(): Gtk.Window | null;
  }

  class ActionRow extends Gtk.Widget {
    constructor(properties?: ActionRowProperties);
    add_suffix(widget: Gtk.Widget): void;
    add_prefix(widget: Gtk.Widget): void;
  }
}
