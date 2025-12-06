// GDK4 type definitions for keyboard event handling

declare namespace Gdk {
  // Key symbol constants
  const KEY_Escape: number;
  const KEY_BackSpace: number;
  const KEY_Return: number;
  const KEY_space: number;
  const KEY_Tab: number;

  // Modifier mask constants
  enum ModifierType {
    SHIFT_MASK = 1 << 0,
    LOCK_MASK = 1 << 1,
    CONTROL_MASK = 1 << 2,
    MOD1_MASK = 1 << 3,
    MOD2_MASK = 1 << 4,
    MOD3_MASK = 1 << 5,
    MOD4_MASK = 1 << 6,
    MOD5_MASK = 1 << 7,
    SUPER_MASK = 1 << 26,
    HYPER_MASK = 1 << 27,
    META_MASK = 1 << 28,
  }
}
