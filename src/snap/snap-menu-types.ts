export interface SnapLayout {
    label: string;
    x: number; // percentage of screen width (0-1)
    y: number; // percentage of screen height (0-1)
    width: number; // percentage of screen width (0-1)
    height: number; // percentage of screen height (0-1)
    zIndex: number; // stacking order for overlapping layouts
}

export interface SnapLayoutGroup {
    name: string;
    layouts: SnapLayout[];
}
