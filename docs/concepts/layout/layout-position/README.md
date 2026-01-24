# Layout Position

## Definition

**Layout Position** defines where a window should be placed on the screen.

Unlike simple numeric coordinates, Layout Position uses string expressions that support various formats:
- Fractions: "1/3", "2/3"
- Percentages: "50%", "100%"
- Pixels: "100px", "200px"
- Calculations: "50% - 10px", "1/3 + 20px"

## Examples

- `x: "0", y: "0"` - Top-left corner
- `x: "50%", y: "0"` - Top-center
- `x: "1/3", y: "50%"` - One-third from left, middle height

## Related Concepts

- See [Layout](../) for the parent concept that uses Layout Position
- See [Layout Size](../layout-size/) for the size counterpart
