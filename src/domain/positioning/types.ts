/**
 * Screen boundaries configuration
 */
export interface ScreenBoundaries {
  /** X offset of the screen/monitor in global coordinate space */
  offsetX: number;
  /** Y offset of the screen/monitor in global coordinate space */
  offsetY: number;
  /** Width of the screen/monitor */
  screenWidth: number;
  /** Height of the screen/monitor */
  screenHeight: number;
  /** Padding from edges */
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
}
