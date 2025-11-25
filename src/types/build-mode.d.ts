/**
 * Build mode global constant
 *
 * This constant is replaced by esbuild during build time:
 * - Development build: __DEV__ = true
 * - Release build: __DEV__ = false
 */
declare const __DEV__: boolean;
