/**
 * Generates a simple UUID v4-like string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  const chars = '0123456789abcdef';
  let uuid = '';

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      // Variant bits: 10xx (8, 9, a, or b)
      const randomIndex = Math.floor(Math.random() * 4);
      uuid += chars[8 + randomIndex];
    } else {
      const randomIndex = Math.floor(Math.random() * 16);
      uuid += chars[randomIndex];
    }
  }

  return uuid;
}
