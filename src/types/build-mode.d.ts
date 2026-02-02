/**
 * Build mode global constant
 *
 * This constant is replaced by esbuild during build time:
 * - Development build: __DEV__ = true
 * - Release build: __DEV__ = false
 */
declare const __DEV__: boolean;

/**
 * License API base URL
 *
 * Injected from LICENSE_API_BASE_URL environment variable at build time.
 * Build fails if not set.
 */
declare const __LICENSE_API_BASE_URL__: string;

/**
 * License purchase page URL
 *
 * Injected from LICENSE_PURCHASE_URL environment variable at build time.
 * Build fails if not set.
 */
declare const __LICENSE_PURCHASE_URL__: string;
