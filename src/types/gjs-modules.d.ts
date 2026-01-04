/**
 * Ambient module declarations for GJS imports
 * Allows TypeScript to recognize gi:// and resource:// module paths
 *
 * This file uses triple-slash directives to import ambient types from @girs packages
 * GNOME Shell 46 specific type definitions
 */

/// <reference types="@girs/st-14/st-14-ambient" />
/// <reference types="@girs/meta-14/meta-14-ambient" />
/// <reference types="@girs/clutter-14/clutter-14-ambient" />
/// <reference types="@girs/shell-14/shell-14-ambient" />
/// <reference types="@girs/gio-2.0/gio-2.0-ambient" />
/// <reference types="@girs/glib-2.0/glib-2.0-ambient" />
/// <reference types="@girs/adw-1/adw-1-ambient" />
/// <reference types="@girs/gtk-4.0/gtk-4.0-ambient" />
/// <reference types="@girs/gdk-4.0/gdk-4.0-ambient" />
/// <reference types="@girs/gnome-shell/dist/extensions/global" />

// GI imports
declare module 'gi://St' {
  export * from '@girs/st-14/st-14';
  export { default } from '@girs/st-14/st-14';
}

declare module 'gi://Meta' {
  export * from '@girs/meta-14/meta-14';
  export { default } from '@girs/meta-14/meta-14';
}

declare module 'gi://Clutter' {
  export * from '@girs/clutter-14/clutter-14';
  export { default } from '@girs/clutter-14/clutter-14';
}

declare module 'gi://Shell' {
  export * from '@girs/shell-14/shell-14';
  export { default } from '@girs/shell-14/shell-14';
}

declare module 'gi://Gio' {
  export * from '@girs/gio-2.0/gio-2.0';
  export { default } from '@girs/gio-2.0/gio-2.0';
}

declare module 'gi://GLib' {
  export * from '@girs/glib-2.0/glib-2.0';
  export { default } from '@girs/glib-2.0/glib-2.0';
}

declare module 'gi://Adw' {
  export * from '@girs/adw-1/adw-1';
  export { default } from '@girs/adw-1/adw-1';
}

declare module 'gi://Gtk' {
  export * from '@girs/gtk-4.0/gtk-4.0';
  export { default } from '@girs/gtk-4.0/gtk-4.0';
}

declare module 'gi://Gdk' {
  export * from '@girs/gdk-4.0/gdk-4.0';
  export { default } from '@girs/gdk-4.0/gdk-4.0';
}

// GNOME Shell resource imports
declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  export * from '@girs/gnome-shell/dist/extensions/extension';
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
  export * from '@girs/gnome-shell/dist/extensions/prefs';
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  export * from '@girs/gnome-shell/dist/ui/main';
}

// Global console for logging (GNOME Shell provides this)
declare const console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  debug(...args: any[]): void;
};

// TextDecoder interface (available in GJS)
interface TextDecoder {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: BufferSource, options?: { stream?: boolean }): string;
}

interface TextDecoderConstructor {
  new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }): TextDecoder;
}

declare const TextDecoder: TextDecoderConstructor;
