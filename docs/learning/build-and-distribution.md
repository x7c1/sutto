# Build and Distribution

## GNOME Shell Extensions Runtime Environment

GNOME Shell extensions run on **GJS (GNOME JavaScript)**, not Node.js.

### Key Differences

| Feature | Node.js | GJS (GNOME Shell) |
|---------|---------|-------------------|
| Runtime | V8 Engine | SpiderMonkey (Firefox engine) |
| Standard Library | Node.js APIs | GLib, GObject |
| Module System | CommonJS/ESM | GJS imports (GNOME 42) / ESM (GNOME 45+) |
| Can use npm packages? | Yes | No (mostly) |

### What You Can Use

**Available:**
- GNOME Shell APIs (St, Clutter, Meta, etc.)
- GJS built-in libraries (GLib, Gio, GObject)
- Your own JavaScript modules

**Not Available:**
- Node.js-specific APIs (fs, http, process, etc.)
- Browser-specific APIs (DOM, window, document)
- Most npm packages (they depend on Node.js or browser APIs)

## Why node_modules Is Not Included in Distribution

### Development Dependencies Only

When you use npm in GNOME Shell extension development, it's typically for:

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/gjs": "^1.0.0",
    "@girs/gnome-shell": "^42.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

These are used at **build time only**:
- TypeScript compilation
- Type checking
- Linting
- Code formatting

### Build Process

```
Development:
├── src/extension.ts          (TypeScript source)
├── node_modules/             (build tools)
└── package.json

        ↓ Build (tsc)

Distribution:
├── extension.js              (Compiled JavaScript)
├── metadata.json
└── stylesheet.css

(node_modules is NOT included)
```

### Runtime Execution

At runtime, GNOME Shell:
1. Loads `extension.js` directly
2. Uses GJS engine (not Node.js)
3. Has no access to `node_modules`
4. Only uses GNOME Shell APIs

## What to Include in Distribution ZIP

### Must Include
```
sutto@x7c1.github.io.zip
├── metadata.json     ✓ Required
├── extension.js      ✓ Required (compiled from .ts if using TypeScript)
├── prefs.js          ✓ If you have settings UI
├── stylesheet.css    ✓ If you have custom styles
└── schemas/          ✓ If you have GSettings schemas
```

### Must Exclude
```
❌ node_modules/       (development dependencies)
❌ .git/               (version control)
❌ .gitignore
❌ .vscode/            (editor config)
❌ .editorconfig
❌ tsconfig.json       (TypeScript config)
❌ package.json        (npm config)
❌ package-lock.json
❌ src/                (TypeScript source - include compiled .js instead)
```

## Using External Libraries

### Option 1: Bundle with Webpack/Rollup (Advanced)

If you really need an external library:

```bash
# Bundle everything into a single file
webpack --entry src/extension.ts --output extension.js
```

This creates a single `extension.js` with all dependencies included.

**Note:** The library must be compatible with GJS (no Node.js or browser APIs).

### Option 2: Copy Necessary Code

For small utilities, you can copy the code directly into your extension.

### Option 3: Use GJS-Compatible Libraries Only

Very few JavaScript libraries work in GJS because they don't depend on Node.js or browser APIs.

## Common Pattern

Most GNOME Shell extensions:
- **Do not use external npm packages at runtime**
- Use only GNOME Shell's built-in APIs
- Use npm only for development tools (TypeScript, linters, etc.)

This keeps extensions lightweight and eliminates dependency issues.

## Publishing Checklist

Before creating distribution ZIP:

1. ✓ Build/compile if using TypeScript
2. ✓ Test the extension in GNOME Shell
3. ✓ Remove development files
4. ✓ Verify metadata.json is correct
5. ✓ Create ZIP with only runtime files
6. ✓ Test installing from ZIP

```bash
# Example build script
npm run build           # Compile TypeScript
make clean             # Remove old builds
make dist              # Create distribution ZIP
gnome-extensions install sutto@x7c1.github.io.zip --force
```
