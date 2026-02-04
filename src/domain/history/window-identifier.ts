/**
 * Identifies a window for layout history lookup and recording
 */
export interface WindowIdentifier {
  /** Unique window ID assigned by the window manager (e.g., 12345678) */
  windowId: number;
  /** WM_CLASS property identifying the application (e.g., "google-chrome", "firefox", "code") */
  wmClass: string;
  /** Window title (e.g., "New Tab - Google Chrome", "index.ts - Visual Studio Code") */
  title: string;
}
