# Layout Expression System

**Status**: Planning (Revised)
**Created**: 2025-11-26
**Revised**: 2025-11-27

## Overview

Design and implement a flexible layout expression system for SnapMenu that supports multiple unit types and arithmetic operations. This replaces the current rigid percentage-based system with a more intuitive and powerful CSS-like syntax.

**Context**: Issue #7 (Snap Menu Display Structure) has been completed. The current architecture uses:
```
container (St.BoxLayout) → displaysContainer (St.BoxLayout) → miniatureDisplay (St.Widget) → buttons (St.Button)
```

Each layout group is rendered as a separate miniature display with aspect ratio matching the screen.

## Current Problems

### 1. Real-World Issues in Existing Layouts

**Example 1: Three-Way Split** (`snap-menu-constants.ts:24-53`)
```typescript
{
    name: 'Three-Way Split',
    layouts: [
        { label: 'Left Third', x: 0, y: 0, width: 0.333, height: 1 },      // Awkward!
        { label: 'Center Third', x: 0.333, y: 0, width: 0.334, height: 1 }, // Why 0.334?
        { label: 'Right Third', x: 0.667, y: 0, width: 0.333, height: 1 },
    ]
}
```

**Problems**:
- Intent is "exact thirds" but expressed as `0.333 + 0.334 + 0.333 = 1.000`
- Middle value `0.334` is a workaround for floating-point precision
- Unclear if `0.333` represents 33.3% or 1/3

**Example 2: Padded Thirds** (`test-layouts.ts:157-186`)
```typescript
{
    name: 'Test G - Padded Thirds',
    layouts: [
        { label: 'Left Padded', x: 0.01, y: 0.01, width: 0.323, height: 0.98 },   // What?
        { label: 'Center Padded', x: 0.343, y: 0.01, width: 0.324, height: 0.98 }, // What??
        { label: 'Right Padded', x: 0.677, y: 0.01, width: 0.323, height: 0.98 },  // What???
    ]
}
```

**Problems**:
- Intent is "1/3 with 10px padding" but expressed as magic numbers `0.323`, `0.343`, `0.677`
- These values are **screen-size dependent** approximations
- Cannot express the actual intent: `x: '10px'`, `width: '1/3 - 20px'`

**Example 3: Fixed Position Layouts** (`test-layouts.ts:11-24`)
```typescript
{
    name: 'Test A - Bottom Left Fixed',
    layouts: [
        {
            label: 'Bottom Left',
            x: 0.02,    // Comment says "20px from left (approximation)"
            y: 0.7,     // Comment says "~70% down from top"
            width: 0.2, // Comment says "~300px width"
            height: 0.28, // Comment says "~300px height"
        },
    ]
}
```

**Problems**:
- Comments reveal the **actual intent** (fixed pixel sizes)
- Values are approximations that break at different screen sizes
- Cannot express true fixed positioning: `x: '20px'`, `width: '300px'`

### 2. Limitations of Percentage-Based System

The current `SnapLayout` interface uses floating-point percentages (0-1 range):

```typescript
interface SnapLayout {
    x: number;      // 0-1 range
    y: number;      // 0-1 range
    width: number;  // 0-1 range
    height: number; // 0-1 range
}
```

**Fundamental limitations**:
- ❌ Cannot express exact fractions (1/3, 2/5, etc.)
- ❌ Cannot express fixed pixel values
- ❌ Cannot express calculations (50% - 200px, 1/3 + 10px)
- ❌ Cannot express right-aligned or centered layouts with fixed sizes
- ❌ Intent is obscured by approximations

## Proposed Solution

### New Layout Expression System

Support **both number and string values** for backward compatibility, with string-based expressions providing advanced features:

```typescript
interface SnapLayout {
    label: string;
    x: number | string;      // Keep number for backward compat, add string for expressions
    y: number | string;      // Expression: '0', '50%', '200px', '50% - 150px'
    width: number | string;  // Expression: '1/3', '300px', '100% - 20px'
    height: number | string; // Expression: '100%', '500px', '1/2'
    zIndex: number;
}
```

**Key Design Decisions** (resolves Open Questions):
1. ✅ **Integer fractions only**: `'1/3'` is valid, `'0.5/3'` is invalid (simplicity)
2. ✅ **No validation for impossible values**: Allow `'200%'`, `'-100px'` (fail at runtime, easier debugging)
3. ✅ **No min/max functions initially**: Can be added later if needed (YAGNI principle)

### Supported Unit Types

| Unit | Syntax | Example | Description |
|------|--------|---------|-------------|
| Zero | `'0'` | `x: '0'` | Zero value (no unit needed) |
| Fraction | `'n/d'` | `width: '1/3'` | Exact fractional values (no rounding errors) |
| Percentage | `'n%'` | `x: '50%'` | Percentage of miniature display size |
| Pixel | `'npx'` | `width: '300px'` | Fixed pixel values (relative to miniature display) |

**Important**: All expressions are evaluated **relative to miniature display size**, not screen size.

### Supported Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `'1/3 + 10px'` | One third plus 10 pixels |
| `-` | Subtraction | `'100% - 300px'` | Full width minus 300 pixels |

**Evaluation Rules**:
- Left-to-right evaluation (no operator precedence)
- No parentheses support
- Whitespace around operators is optional

### Example Layouts (Revised)

**Three-Way Split** (exact thirds, no rounding errors):
```typescript
{
    name: 'Three-Way Split',
    layouts: [
        { label: 'Left', x: '0', y: '0', width: '1/3', height: '100%', zIndex: 0 },
        { label: 'Center', x: '1/3', y: '0', width: '1/3', height: '100%', zIndex: 0 },
        { label: 'Right', x: '2/3', y: '0', width: '1/3', height: '100%', zIndex: 0 },
    ]
}
```

**Padded Thirds** (clear intent):
```typescript
{
    name: 'Padded Thirds',
    layouts: [
        { label: 'Left', x: '10px', y: '10px', width: '1/3 - 20px', height: '100% - 20px', zIndex: 0 },
        { label: 'Center', x: '1/3 + 10px', y: '10px', width: '1/3 - 20px', height: '100% - 20px', zIndex: 0 },
        { label: 'Right', x: '2/3 + 10px', y: '10px', width: '1/3 - 20px', height: '100% - 20px', zIndex: 0 },
    ]
}
```

**Fixed Position** (impossible with current system):
```typescript
{
    name: 'Bottom Left Fixed',
    layouts: [
        {
            label: 'Bottom Left',
            x: '20px',
            y: '70% - 150px',  // 70% down, then adjust by 150px
            width: '300px',
            height: '300px',
            zIndex: 0
        },
    ]
}
```

**Centered Window** (impossible with current system):
```typescript
{
    name: 'Centered Window',
    layouts: [
        {
            label: 'Center',
            x: '50% - 400px',   // Center horizontally
            y: '50% - 300px',   // Center vertically
            width: '800px',
            height: '600px',
            zIndex: 0
        },
    ]
}
```

## Technical Design

### Grammar (BNF-like notation)

```
expression := term (operator term)*
operator   := '+' | '-'
term       := fraction | percentage | pixel | zero
fraction   := integer '/' integer          // Only integers allowed
percentage := number '%'
pixel      := number 'px'
zero       := '0'
integer    := [0-9]+
number     := [0-9]+ ('.' [0-9]+)?
```

### Implementation Architecture

**File: `src/snap/layout-expression/types.ts`**
```typescript
// Abstract Syntax Tree type definitions
export type LayoutUnit =
    | { type: 'fraction'; numerator: number; denominator: number }
    | { type: 'percentage'; value: number }  // 0-1 range
    | { type: 'pixel'; value: number }
    | { type: 'zero' };

export type LayoutExpression =
    | LayoutUnit
    | { type: 'add'; left: LayoutExpression; right: LayoutExpression }
    | { type: 'subtract'; left: LayoutExpression; right: LayoutExpression };
```

**File: `src/snap/layout-expression/parser.ts`**
```typescript
import type { LayoutExpression, LayoutUnit } from './types';

/**
 * Parse expression string to AST
 * @throws Error if expression is invalid
 */
export function parse(expr: string): LayoutExpression;
```

**File: `src/snap/layout-expression/evaluator.ts`**
```typescript
import type { LayoutExpression, LayoutUnit } from './types';

/**
 * Evaluate expression to pixel value
 * @param expr - Parsed expression AST
 * @param containerSize - Miniature display size in pixels (width or height)
 * @returns Resolved pixel value (rounded to nearest integer)
 */
export function evaluate(expr: LayoutExpression, containerSize: number): number;
```

**File: `src/snap/layout-expression/index.ts`**
```typescript
// Re-export all public APIs for convenient imports
export { parse } from './parser';
export { evaluate } from './evaluator';
export type { LayoutExpression, LayoutUnit } from './types';
```

**Usage example**:
```typescript
import { parse, evaluate } from '../layout-expression';

const expr = parse('1/3 + 10px');
const pixels = evaluate(expr, 300); // → 110
```

### Integration with Current Renderer

**Current implementation** (`snap-menu-renderer.ts:262-333`):
```typescript
function createLayoutButton(
    layout: SnapLayout,
    displayWidth: number,
    displayHeight: number,
    // ...
) {
    // Current: Only handles numbers
    const buttonX = Math.floor(layout.x * displayWidth);
    const buttonY = Math.floor(layout.y * displayHeight);
    // ...
}
```

**Updated implementation**:
```typescript
import { LayoutExpressionParser, LayoutExpressionEvaluator } from './layout-expression';

function createLayoutButton(
    layout: SnapLayout,
    displayWidth: number,
    displayHeight: number,
    // ...
) {
    // Handle both number and string
    const buttonX = resolveLayoutValue(layout.x, displayWidth);
    const buttonY = resolveLayoutValue(layout.y, displayHeight);
    const buttonWidth = calculateButtonWidth(
        layout,
        displayWidth,
        nextLayout,
        buttonX
    );
    const buttonHeight = resolveLayoutValue(layout.height, displayHeight) - BUTTON_BORDER_WIDTH * 2;
    // ...
}

/**
 * Resolve layout value (number or string expression) to pixels
 */
function resolveLayoutValue(value: number | string, containerSize: number): number {
    if (typeof value === 'number') {
        // Backward compatibility: treat as percentage (0-1 range)
        return Math.floor(value * containerSize);
    }
    // Parse and evaluate expression
    const expr = LayoutExpressionParser.parse(value);
    return LayoutExpressionEvaluator.evaluate(expr, containerSize);
}
```

### "Stretch to Next Layout" Logic

**Important**: The existing `calculateButtonWidth()` logic (snap-menu-renderer.ts:338-359) is **correct and should be preserved**.

The expression system does NOT eliminate this logic. Instead, it makes it more explicit:

**Current approach** (implicit stretching):
```typescript
// Layout with width 1/3, but button stretches to next layout
{ x: 0, width: 0.333 }
```

**With expressions** (explicit stretching):
```typescript
// Option 1: Use exact width (no stretching)
{ x: '0', width: '1/3' }

// Option 2: Explicitly calculate to next layout
{ x: '0', width: '1/2 - 1px' }  // Stretch to x=1/2 with 1px gap
```

The `calculateButtonWidth()` function will still check for `nextLayout` and stretch accordingly. Expression system provides **flexibility**, not replacement.

## Benefits

### 1. Clear Intent

**Before**:
```typescript
width: 0.323  // What does this mean?
```

**After**:
```typescript
width: '1/3 - 20px'  // Crystal clear: one third minus 20 pixels
```

### 2. No Rounding Errors

**Before**:
```typescript
// Awkward workaround for thirds
{ width: 0.333 }, { width: 0.334 }, { width: 0.333 }
```

**After**:
```typescript
// Exact thirds
{ width: '1/3' }, { width: '1/3' }, { width: '1/3' }
```

### 3. Screen-Size Independence

**Before**:
```typescript
// These approximations break at different screen sizes
x: 0.02,    // "20px from left (approximation)" - wrong on 4K screens
width: 0.2, // "~300px width" - wrong on all screens except the one used for calculation
```

**After**:
```typescript
// True intent preserved at all screen sizes
x: '20px',
width: '300px',
```

### 4. Advanced Layouts

Enables layouts that were **impossible** before:
- Right-aligned fixed panels: `{ x: '100% - 300px', width: '300px' }`
- Centered windows: `{ x: '50% - 400px', width: '800px' }`
- Padded layouts: `{ x: '10px', width: '100% - 20px' }`
- Mixed calculations: `{ x: '1/3 + 5px', width: '2/3 - 10px' }`

### 5. CSS-like Familiarity

Web developers will recognize this syntax immediately (similar to CSS `calc()`).

## Migration Strategy

### Phase 1: Test Framework Setup & Implementation (Non-breaking)

#### Step 1.1: Install Vitest

**Why Vitest?**
- Native TypeScript support with minimal configuration
- Compatible with existing esbuild setup
- Fast execution (esbuild-based transformation)
- Modern, actively maintained (as of 2025)
- Perfect for testing pure TypeScript logic (no GJS dependencies)

**Important Note**: GNOME Shell extensions use `imports.gi.*` which cannot run in Node.js environment. We can only test **pure TypeScript code** (parsers, evaluators, utilities). UI code using `St`, `Clutter`, `Meta` must be tested manually in nested GNOME Shell session.

**Installation**:
```bash
npm install --save-dev vitest
```

**Update `package.json`**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Create `vitest.config.ts`**:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  esbuild: {
    target: 'es2020',
  },
});
```

**Update `tsconfig.json`** (add Vitest globals):
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

#### Step 1.2: Create Expression System

**File structure**:
```
src/snap/layout-expression/
├── index.ts          # Re-export all public APIs
├── types.ts          # AST type definitions
├── parser.ts         # Parser implementation
├── parser.test.ts    # Parser tests
├── evaluator.ts      # Evaluator implementation
└── evaluator.test.ts # Evaluator tests
```

**Note**: Tests are placed next to their implementation files (`.test.ts` suffix) for maximum proximity and discoverability.

**Steps**:
1. Install Vitest and configure test environment
2. Create parser and evaluator classes (pure TypeScript, no GJS imports)
3. Add comprehensive unit tests
4. No changes to existing GJS-dependent code yet

**Testing**:
- Unit tests for all grammar rules
- Edge cases: whitespace, decimals, large numbers
- Error cases: invalid syntax, division by zero
- Run tests with: `npm test` (watch mode) or `npm run test:run` (single run)

### Phase 2: Integration with Renderer

**Steps**:
1. Update `SnapLayout` interface: `x: number | string` (etc.)
2. Add `resolveLayoutValue()` helper function in `snap-menu-renderer.ts`
3. Update `createLayoutButton()` to use helper
4. Keep ALL existing layouts unchanged (100% backward compatible)

**Testing**:
- Manual testing in nested GNOME Shell session:
  ```bash
  dbus-run-session -- gnome-shell --nested --wayland
  ```
- Verify all existing layouts still render correctly
- Add new test layouts using expression syntax
- Test at different screen sizes (1920×1080, 2560×1440, 3840×2160)

### Phase 3: Migration

**Steps**:
1. Convert `DEFAULT_LAYOUT_GROUPS` to use expressions:
   - Three-Way Split: Use `'1/3'` instead of `0.333/0.334/0.333`
   - Center Half: Keep as `0.25`, `0.5` (or convert to `'25%'`, `'50%'`)
   - Two-Way Split: Keep as `0`, `0.5` (or convert to `'0'`, `'50%'`)
2. Convert test layouts where expressions add value:
   - Test G (Padded Thirds): Convert to `'10px'`, `'1/3 - 20px'`
   - Test A (Fixed Position): Convert to `'20px'`, `'300px'`
3. Leave simple layouts as numbers (no benefit from conversion)

**Testing**:
- Manual visual regression testing in nested GNOME Shell
- Compare miniature display rendering before/after
- Verify pixel-perfect accuracy across different screen sizes
- Run unit tests to ensure expression evaluation matches expected values

### Phase 4: Documentation (Optional Future Work)

**Only if we want to deprecate number format**:
1. Add deprecation warnings for number values
2. Update all documentation to show expression syntax
3. Consider eventual removal of number support (breaking change)

**Note**: There's no urgent need for Phase 4. Supporting both formats indefinitely is acceptable.

## Testing Strategy

### Overview

**Two-Layer Testing Approach**:

1. **Pure TypeScript Logic** → Vitest (automated unit tests)
   - Parser, Evaluator, utility functions
   - No `imports.gi.*` dependencies
   - Fast, repeatable, CI-compatible

2. **GJS/UI Code** → Manual testing in nested GNOME Shell
   - Renderer integration, button creation, visual appearance
   - Cannot be automated due to GJS runtime requirements
   - Command: `dbus-run-session -- gnome-shell --nested --wayland`

**Why This Approach?**

GNOME Shell extensions use GJS-specific imports (`imports.gi.St`, `imports.gi.Clutter`) that cannot run in Node.js environment. Standard JavaScript test frameworks (Jest, Vitest, Mocha) cannot import or mock these GJS bindings.

**Alternative frameworks** like `@gjsify/unit` exist but are:
- Unmaintained (last commit ~2020)
- No TypeScript support
- Limited community adoption

**Practical solution**: Separate pure logic (testable) from UI code (manual testing).

### Unit Tests (Vitest)

**Test Framework**: Vitest
**Test File Convention**: `*.test.ts` (co-located with implementation)

#### Parser Tests

**File**: `src/snap/layout-expression/parser.test.ts`

```typescript
describe('LayoutExpressionParser', () => {
    describe('Basic terms', () => {
        test('parses zero', () => {
            expect(parse('0')).toEqual({ type: 'zero' });
        });

        test('parses integer fraction', () => {
            expect(parse('1/3')).toEqual({
                type: 'fraction',
                numerator: 1,
                denominator: 3
            });
        });

        test('rejects decimal fraction', () => {
            expect(() => parse('0.5/3')).toThrow('Fractions must use integers');
        });

        test('parses percentage', () => {
            expect(parse('50%')).toEqual({
                type: 'percentage',
                value: 0.5
            });
        });

        test('parses decimal percentage', () => {
            expect(parse('33.33%')).toEqual({
                type: 'percentage',
                value: 0.3333
            });
        });

        test('parses pixel', () => {
            expect(parse('300px')).toEqual({
                type: 'pixel',
                value: 300
            });
        });

        test('parses decimal pixel', () => {
            expect(parse('10.5px')).toEqual({
                type: 'pixel',
                value: 10.5
            });
        });
    });

    describe('Operations', () => {
        test('parses addition', () => {
            expect(parse('50% + 10px')).toEqual({
                type: 'add',
                left: { type: 'percentage', value: 0.5 },
                right: { type: 'pixel', value: 10 }
            });
        });

        test('parses subtraction', () => {
            expect(parse('100% - 300px')).toEqual({
                type: 'subtract',
                left: { type: 'percentage', value: 1.0 },
                right: { type: 'pixel', value: 300 }
            });
        });

        test('parses complex expression (left-to-right)', () => {
            expect(parse('100% - 300px + 10px')).toEqual({
                type: 'add',
                left: {
                    type: 'subtract',
                    left: { type: 'percentage', value: 1.0 },
                    right: { type: 'pixel', value: 300 }
                },
                right: { type: 'pixel', value: 10 }
            });
        });

        test('handles whitespace variations', () => {
            expect(parse('100%-300px')).toEqual(parse('100% - 300px'));
            expect(parse(' 100%  -  300px ')).toEqual(parse('100% - 300px'));
        });
    });

    describe('Error cases', () => {
        test('throws on empty string', () => {
            expect(() => parse('')).toThrow();
        });

        test('throws on invalid syntax', () => {
            expect(() => parse('abc')).toThrow();
        });

        test('throws on incomplete expression', () => {
            expect(() => parse('100% - ')).toThrow();
        });
    });
});
```

#### Evaluator Tests

**File**: `src/snap/layout-expression/evaluator.test.ts`

```typescript
describe('LayoutExpressionEvaluator', () => {
    const DISPLAY_WIDTH = 300; // MINIATURE_DISPLAY_WIDTH constant

    describe('Basic units', () => {
        test('evaluates zero', () => {
            expect(evaluate({ type: 'zero' }, DISPLAY_WIDTH)).toBe(0);
        });

        test('evaluates fraction', () => {
            expect(evaluate({
                type: 'fraction',
                numerator: 1,
                denominator: 3
            }, DISPLAY_WIDTH)).toBe(100); // 300 / 3 = 100
        });

        test('evaluates percentage', () => {
            expect(evaluate({
                type: 'percentage',
                value: 0.5
            }, DISPLAY_WIDTH)).toBe(150); // 300 * 0.5 = 150
        });

        test('evaluates pixel', () => {
            expect(evaluate({
                type: 'pixel',
                value: 50
            }, DISPLAY_WIDTH)).toBe(50);
        });
    });

    describe('Composite expressions', () => {
        test('evaluates addition', () => {
            // 50% + 10px = 150 + 10 = 160
            expect(evaluate(parse('50% + 10px'), DISPLAY_WIDTH)).toBe(160);
        });

        test('evaluates subtraction', () => {
            // 100% - 50px = 300 - 50 = 250
            expect(evaluate(parse('100% - 50px'), DISPLAY_WIDTH)).toBe(250);
        });

        test('evaluates complex expression', () => {
            // 100% - 50px + 10px = 300 - 50 + 10 = 260
            expect(evaluate(parse('100% - 50px + 10px'), DISPLAY_WIDTH)).toBe(260);
        });

        test('evaluates fraction with pixel adjustment', () => {
            // 1/3 - 20px = 100 - 20 = 80
            expect(evaluate(parse('1/3 - 20px'), DISPLAY_WIDTH)).toBe(80);
        });
    });

    describe('Real-world scenarios', () => {
        test('centered layout', () => {
            // x: '50% - 150px' for 300px wide window
            // = 150 - 150 = 0 (left edge when centered on 300px display)
            expect(evaluate(parse('50% - 150px'), DISPLAY_WIDTH)).toBe(0);
        });

        test('right-aligned panel', () => {
            // x: '100% - 75px' for 75px wide panel
            // = 300 - 75 = 225
            expect(evaluate(parse('100% - 75px'), DISPLAY_WIDTH)).toBe(225);
        });

        test('padded layout', () => {
            // width: '100% - 20px' with 10px padding on each side
            // = 300 - 20 = 280
            expect(evaluate(parse('100% - 20px'), DISPLAY_WIDTH)).toBe(280);
        });
    });

    describe('Rounding', () => {
        test('rounds to nearest integer', () => {
            // 33.33% of 300 = 99.99 → 100
            expect(evaluate(parse('33.33%'), DISPLAY_WIDTH)).toBe(100);
        });

        test('rounds fraction result', () => {
            // 1/3 of 301 = 100.333... → 100
            expect(evaluate(parse('1/3'), 301)).toBe(100);
        });
    });
});
```

### Integration Tests (Manual)

**Manual Testing Procedure**:

1. **Setup nested GNOME Shell session**:
   ```bash
   dbus-run-session -- gnome-shell --nested --wayland
   ```

2. **Load extension in nested session**:
   ```bash
   npm run build
   npm run copy-files
   # Enable extension in nested session
   ```

3. **Visual verification checklist**:
   - [ ] All existing layouts render correctly (backward compatibility)
   - [ ] Three-Way Split uses exact thirds (no gaps or overlaps)
   - [ ] Padded layouts show correct 10px padding
   - [ ] Fixed position layouts maintain size across resolutions
   - [ ] Button hover effects work correctly
   - [ ] Click events trigger layout selection
   - [ ] Auto-hide behavior functions properly

4. **Test at different screen sizes**:
   - 1920×1080 (16:9)
   - 2560×1440 (16:9)
   - 3840×2160 (16:9, 4K)
   - 1920×1200 (16:10)

5. **Compare before/after**:
   - Take screenshots of each layout group
   - Verify pixel-perfect rendering matches expectations
   - Check button positions align with expressions

**Edge Cases to Test**:
- Very small miniature display (100px width simulation)
- Very large miniature display (1000px width simulation)
- Fractional pixel calculations (verify proper rounding)
- Expression edge cases: `'0'`, `'100%'`, `'1/1'`

## Implementation Files

**New files to create**:
```
# Test framework configuration
vitest.config.ts                     # Vitest configuration

# Expression system implementation
src/snap/layout-expression/
├── index.ts                         # Re-export all public APIs
├── types.ts                         # AST type definitions
├── parser.ts                        # Parser implementation
├── parser.test.ts                   # Parser unit tests
├── evaluator.ts                     # Evaluator implementation
└── evaluator.test.ts                # Evaluator unit tests
```

**Files to modify**:
```
# Package configuration
package.json                         # Add vitest dependency, update test scripts
tsconfig.json                        # Add vitest/globals to types

# Documentation
docs/guides/07-testing.md           # NEW: Testing guide for Vitest and manual testing

# Type definitions
src/snap/snap-menu-types.ts         # Update SnapLayout interface: x/y/width/height to number | string

# Renderer integration
src/snap/snap-menu-renderer.ts      # Add resolveLayoutValue(), update createLayoutButton()

# Layout definitions (Phase 3)
src/snap/snap-menu-constants.ts     # Convert DEFAULT_LAYOUT_GROUPS to use expressions
src/snap/test-layouts.ts             # Convert test layouts to use expressions
```

## Notes on Issue #7 Integration

**Important**: Issue #7 (Snap Menu Display Structure) is **already completed**.

Current architecture (implemented in `snap-menu-renderer.ts`):
```
container (St.BoxLayout - vertical)
└── displaysContainer (St.BoxLayout - vertical)
    └── miniatureDisplay (St.Widget - FixedLayout) × N
        └── buttons (St.Button) × M
```

**Expression evaluation context**:
- All expressions are evaluated **relative to miniature display dimensions**
- Miniature display width: `MINIATURE_DISPLAY_WIDTH = 300` (constant)
- Miniature display height: `MINIATURE_DISPLAY_WIDTH * (screenHeight / screenWidth)` (aspect ratio)
- Layout buttons are positioned within miniature display using `FixedLayout`

**Example**:
```typescript
// On a 1920×1080 screen:
// - Miniature display: 300px × 168.75px (16:9 aspect ratio)
// - Expression '1/3' for width → 100px on miniature display
// - Expression '50%' for y → 84.375px → 84px on miniature display
```

This is **exactly** how the current percentage-based system works. Expression system maintains the same evaluation context.

## References

**Code References**:
- Current implementation: `src/snap/snap-menu-renderer.ts:262-359` (createLayoutButton, calculateButtonWidth)
- Layout definitions: `src/snap/snap-menu-constants.ts`, `src/snap/test-layouts.ts`
- Issue #7: Snap Menu Display Structure (COMPLETED)

**Specifications**:
- CSS `calc()` specification: https://developer.mozilla.org/en-US/docs/Web/CSS/calc

**Testing Resources**:
- Vitest documentation: https://vitest.dev/
- Vitest configuration: https://vitest.dev/config/
- GNOME Shell testing discussion: https://stackoverflow.com/questions/8425616/how-to-test-debug-gnome-shell-extensions
- GJS testing limitations: https://discourse.gnome.org/t/proposal-transition-gnome-shell-js-extensions-to-typescript-guide-for-extensions-today/4270

## Resolved Questions

1. ✅ **Decimal fractions**: NO, only integer fractions allowed (e.g., `'1/3'` valid, `'0.5/3'` invalid)
2. ✅ **Validation**: NO validation for impossible values (allow `'200%'`, `'-100px'` - fail at runtime for easier debugging)
3. ✅ **min/max functions**: NO, not in initial implementation (can be added later if needed)
4. ✅ **Migration strategy**: Support both `number` and `string` indefinitely (no forced migration)
5. ✅ **Evaluation context**: Always relative to miniature display dimensions (not screen dimensions)
6. ✅ **Stretch logic**: Preserve existing `calculateButtonWidth()` logic (expression system provides flexibility, not replacement)
7. ✅ **Test framework**: Vitest for pure TypeScript logic, manual testing for GJS/UI code (no GJS-specific test framework due to maintenance concerns)

## Implementation Status

**Status**: ✅ **COMPLETED**

**Implementation Date**: 2025-11-27

### Phase 1: Test Framework & Core Logic ✅
- Vitest installed and configured (v4.0.14)
- Parser implementation complete with 28 unit tests
- Evaluator implementation complete with 34 unit tests
- All 62 tests passing
- Function-based API (not class-based, per Biome rules)

### Phase 2: Renderer Integration ✅
- `SnapLayout` interface updated to support `number | string`
- `resolveLayoutValue()` helper function added to `snap-menu-renderer.ts`
- All rendering functions updated to handle both formats
- `window-snap-manager.ts` updated for window positioning
- Full backward compatibility maintained

### Phase 3: Layout Migration ✅
- `DEFAULT_LAYOUT_GROUPS` converted to expression syntax:
  - Three-Way Split: `0.333/0.334/0.333` → `'1/3'`
  - Center Half: `0.25`, `0.5` → `'25%'`, `'50%'`
  - Two-Way Split: `0`, `0.5` → `'0'`, `'50%'`
- Test layouts converted where beneficial:
  - Test A: Approximations → `'20px'`, `'300px'`, `'70%'`
  - Test B: `0.333/0.334` → `'1/3'`
  - Test G: Complex calculations → `'10px'`, `'1/3 - 20px'`, `'1/3 + 10px'`
- Visual testing completed in nested GNOME Shell

### Phase 4: Documentation ⚪
- Not required (both formats supported indefinitely)

### Final Verification
- ✅ Build successful (`npm run build`)
- ✅ Code quality checks passed (`npm run check`)
- ✅ All unit tests passing (62/62)
- ✅ Visual regression testing completed
- ✅ Zero TypeScript errors
- ✅ Zero Biome warnings
