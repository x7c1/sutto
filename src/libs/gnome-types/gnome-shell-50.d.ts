/**
 * Hand-written augmentations for GNOME Shell 50 type definitions.
 *
 * The upstream `@girs/gnome-shell@50` types narrow `Extension.metadata` to
 * `MetadataJson` (the raw JSON shape), but the runtime value is the fuller
 * `ExtensionMetadata` object with `dir` (Gio.File) and `path` (string) attached
 * by GNOME Shell's extension loader. Sutto reads `metadata.dir` /
 * `metadata.path` from `this.metadata` inside an Extension subclass, so the
 * upstream type must be widened to match runtime via interface merging.
 */

import type { ExtensionMetadata } from '@girs/gnome-shell/dist/types/extension-metadata';

declare module '@girs/gnome-shell/dist/extensions/extension' {
  interface Extension {
    readonly metadata: ExtensionMetadata;
  }
}
