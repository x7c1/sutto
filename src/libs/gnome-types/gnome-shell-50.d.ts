/**
 * Hand-written augmentations for GNOME Shell 50 type definitions.
 *
 * The upstream `@girs/gnome-shell@50` types narrow `Extension.metadata` to
 * `MetadataJson` (the raw JSON shape), but the runtime value is the fuller
 * `ExtensionMetadata` object with `dir` (Gio.File) and `path` (string) attached
 * by GNOME Shell's extension loader. Sutto reads `metadata.dir` /
 * `metadata.path` from `this.metadata` inside an Extension subclass, so the
 * upstream type must be widened to match runtime via interface merging.
 *
 * Upstream declares `ExtensionMetadata` in `dist/types/extension-metadata`,
 * which the package's `exports` map does not expose, so it is mirrored here
 * and added to the `extensions/extension` module.
 */

import type Gio from '@girs/gio-2.0';

declare module '@girs/gnome-shell/extensions/extension' {
  /**
   * The metadata object GNOME Shell attaches to a loaded extension.
   *
   * @see https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/extensions/sharedInternals.js
   */
  export interface ExtensionMetadata {
    readonly uuid: string;
    readonly dir: Gio.File;
    readonly path: string;
    readonly name: string;
    readonly description: string;
    readonly version?: string;
    readonly url?: string;
    readonly 'shell-version': string[];
    readonly 'settings-schema'?: string;
    readonly 'gettext-domain'?: string;
    readonly 'original-author'?: string[];
    readonly 'extension-id'?: string;
    readonly 'version-name'?: string;
  }

  interface Extension {
    readonly metadata: ExtensionMetadata;
  }
}
