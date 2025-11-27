# Testing Guide

## Overview

This project uses a two-layer testing approach to handle the unique constraints of GNOME Shell extension development:

1. **Pure TypeScript Logic** → Automated unit tests with Vitest
2. **GJS/UI Code** → Manual testing in nested GNOME Shell session

## Why Two Layers?

GNOME Shell extensions use GJS-specific imports (`imports.gi.St`, `imports.gi.Clutter`, etc.) that cannot run in Node.js environment. Standard JavaScript test frameworks (Jest, Vitest, Mocha) cannot import or mock these GJS bindings.

**Solution**: Separate pure business logic (testable with Vitest) from UI code (manual testing required).

## Test Framework: Vitest

### Why Vitest?

- Native TypeScript support with minimal configuration
- Compatible with existing esbuild setup
- Fast execution (esbuild-based transformation)
- Modern, actively maintained
- Perfect for testing pure TypeScript logic

### Installation

```bash
npm install --save-dev vitest
```

### Configuration

**File**: `vitest.config.ts`
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

**Update `tsconfig.json`** (add Vitest globals):
```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Running Tests

### Watch Mode (Development)

```bash
npm test
```

Runs tests continuously, re-running when files change. Ideal for TDD workflow.

### Single Run (CI/Pre-commit)

```bash
npm run test:run
```

Runs tests once and exits. Use this in CI pipelines or pre-commit hooks.

### Coverage Report

```bash
npm run test:coverage
```

Generates code coverage report showing which lines are tested.

## Writing Tests

### Test File Convention

Tests are placed next to their implementation files using `.test.ts` suffix:

```
src/snap/layout-expression/
├── parser.ts         # Implementation
├── parser.test.ts    # Tests
├── evaluator.ts      # Implementation
└── evaluator.test.ts # Tests
```

This ensures maximum proximity between tests and implementation.

### Example Test

**File**: `src/snap/layout-expression/parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { LayoutExpressionParser } from './parser';

describe('LayoutExpressionParser', () => {
  describe('Basic terms', () => {
    it('parses zero', () => {
      expect(LayoutExpressionParser.parse('0')).toEqual({ type: 'zero' });
    });

    it('parses fraction', () => {
      expect(LayoutExpressionParser.parse('1/3')).toEqual({
        type: 'fraction',
        numerator: 1,
        denominator: 3,
      });
    });

    it('parses percentage', () => {
      expect(LayoutExpressionParser.parse('50%')).toEqual({
        type: 'percentage',
        value: 0.5,
      });
    });
  });

  describe('Error cases', () => {
    it('throws on invalid syntax', () => {
      expect(() => LayoutExpressionParser.parse('abc')).toThrow();
    });
  });
});
```

### What Can Be Tested?

**✅ Testable (Pure TypeScript)**:
- Parser classes
- Evaluator classes
- Utility functions
- Business logic
- Type validation
- Calculations

**❌ Not Testable (GJS Dependencies)**:
- UI rendering code
- St.Button creation
- Clutter layout
- Main.layoutManager calls
- Any code importing from `imports.gi.*`

## Manual Testing (GJS/UI Code)

### Setup Nested GNOME Shell Session

```bash
dbus-run-session -- gnome-shell --nested --wayland
```

This creates a separate GNOME Shell instance for testing without affecting your main desktop.

### Load Extension

```bash
# Build the extension
npm run build

# Copy files to extension directory
npm run copy-files

# In nested session, enable the extension
# Use Extensions app or command line
```

### Visual Testing Checklist

- [ ] Menu appears at correct position
- [ ] Layout buttons render correctly
- [ ] Hover effects work
- [ ] Click events trigger layout selection
- [ ] Auto-hide behavior functions properly
- [ ] All layout groups display correctly

### Testing at Different Screen Sizes

Test the extension at multiple resolutions:
- 1920×1080 (16:9, Full HD)
- 2560×1440 (16:9, QHD)
- 3840×2160 (16:9, 4K)
- 1920×1200 (16:10)

## Project-Specific Tests

### Layout Expression System

**Testable Components** (Vitest):
- `src/snap/layout-expression/parser.ts` - Expression parsing
- `src/snap/layout-expression/evaluator.ts` - Expression evaluation

**Manual Testing** (Nested Shell):
- `src/snap/snap-menu-renderer.ts` - Button rendering
- Visual verification of layout positions
- Miniature display aspect ratio correctness

### Test Coverage Goals

- **Parser**: 100% coverage (all grammar rules, error cases)
- **Evaluator**: 100% coverage (all unit types, operations, rounding)
- **UI Code**: Manual checklist completion

## Troubleshooting

### Tests Not Found

Vitest automatically detects files matching these patterns:
- `**/*.test.ts`
- `**/*.spec.ts`
- `**/__tests__/**/*.ts`

If tests aren't found, verify file naming matches one of these patterns.

### Import Errors

If tests fail with import errors:

1. Check `tsconfig.json` includes Vitest types:
   ```json
   {
     "compilerOptions": {
       "types": ["vitest/globals"]
     }
   }
   ```

2. Ensure `vitest.config.ts` target matches `tsconfig.json`:
   ```typescript
   esbuild: {
     target: 'es2020',  // Must match tsconfig.json
   }
   ```

### GJS Import Errors in Tests

If you see errors like `Cannot find module 'gi://St'`:

**This is expected!** You're trying to test GJS-dependent code with Vitest.

**Solution**: Extract the pure logic into a separate function that doesn't import GJS modules.

**Example**:

```typescript
// ❌ Cannot test (imports St)
import St from 'gi://St';

export function createButton(label: string) {
  return new St.Button({ label });
}

// ✅ Can test (pure logic)
export function validateButtonLabel(label: string): boolean {
  return label.length > 0 && label.length <= 50;
}
```

## Best Practices

### 1. Test First, Then Implement

Write tests before implementation (TDD):
1. Write failing test
2. Implement minimal code to pass
3. Refactor while keeping tests green

### 2. Test Edge Cases

Always test:
- Boundary values (0, 100%, minimum/maximum)
- Invalid input (error handling)
- Edge cases specific to domain (e.g., division by zero)

### 3. Keep Tests Fast

- Use pure functions whenever possible
- Avoid file I/O in unit tests
- Mock external dependencies (if needed)

### 4. Descriptive Test Names

```typescript
// ✅ Good - describes expected behavior
it('parses "1/3" as fraction with numerator 1 and denominator 3', () => {
  expect(parse('1/3')).toEqual({
    type: 'fraction',
    numerator: 1,
    denominator: 3,
  });
});

// ❌ Bad - unclear what's being tested
it('works', () => {
  expect(parse('1/3')).toBeTruthy();
});
```

### 5. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('evaluates percentage expression', () => {
  // Arrange: Set up test data
  const expr = parse('50%');
  const containerSize = 300;

  // Act: Execute the code under test
  const result = evaluate(expr, containerSize);

  // Assert: Verify the result
  expect(result).toBe(150);
});
```

## CI Integration (Future)

When setting up CI pipelines, use:

```bash
npm run test:run
```

This runs tests once and exits with appropriate exit code for CI systems.

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Configuration](https://vitest.dev/config/)
- [GNOME Shell Testing Discussion](https://stackoverflow.com/questions/8425616/how-to-test-debug-gnome-shell-extensions)
- [GJS Testing Limitations](https://discourse.gnome.org/t/proposal-transition-gnome-shell-js-extensions-to-typescript-guide-for-extensions-today/4270)
