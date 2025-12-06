/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Element dimensions
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Screen boundaries configuration
 */
export interface ScreenBoundaries {
  screenWidth: number;
  screenHeight: number;
  edgePadding: number;
}

/**
 * Options for main panel positioning
 */
export interface MainPanelPositionOptions {
  /** Whether to center the panel horizontally on the cursor */
  centerHorizontally?: boolean;
  /** Whether to center the panel vertically on the cursor */
  centerVertically?: boolean;
  /** Whether to reserve space for debug panel on the right */
  reserveDebugPanelSpace?: boolean;
  /** Debug panel gap (if reserving space) */
  debugPanelGap?: number;
  /** Debug panel width (if reserving space) */
  debugPanelWidth?: number;
}

/**
 * Options for debug panel positioning
 */
export interface DebugPanelPositionOptions {
  /** Only adjust Y coordinate (keep X as-is) */
  adjustYOnly?: boolean;
}
