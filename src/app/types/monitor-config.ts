export interface Monitor {
  index: number; // 0-based monitor index ("0", "1", "2"...)
  geometry: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  isPrimary: boolean;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}
