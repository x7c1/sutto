export interface Layout {
  id: string; // Unique identifier (UUID)
  hash: string; // Coordinate-based hash for duplicate detection
  label: string;
  x: string; // expression: '1/3', '50%', '100px', '50% - 10px', etc.
  y: string; // expression: '0', '50%', '10px', etc.
  width: string; // expression: '1/3', '300px', '100% - 20px', etc.
  height: string; // expression: '100%', '1/2', '500px', etc.
}
