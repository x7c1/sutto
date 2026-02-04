/**
 * Generates a deterministic hash from layout coordinates and dimensions.
 * Used for detecting layouts with identical coordinates (duplicate detection).
 *
 * @param x - X coordinate expression
 * @param y - Y coordinate expression
 * @param width - Width expression
 * @param height - Height expression
 * @returns Hash string in format "hash-{hex}"
 */
export function generateLayoutHash(x: string, y: string, width: string, height: string): string {
  // Simple hash algorithm: concatenate all values and compute hash
  const input = `${x}|${y}|${width}|${height}`;

  // Simple string hash function (similar to Java's hashCode)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and ensure it's always 8 characters
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');

  return `hash-${hexHash}`;
}
