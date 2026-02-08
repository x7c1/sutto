# TypeScript Environment Setup for GNOME Shell Extension Development

Status: Completed

## Overview
Set up TypeScript development environment for the Snappa GNOME Shell extension to enable type-safe development with modern JavaScript features while maintaining compatibility with the GJS runtime.

## Background
The Snappa extension is currently written in plain JavaScript (extension.js). TypeScript will provide:
- Type safety and better IDE support
- Better code documentation through types
- Compile-time error detection
- Modern JavaScript features with transpilation

However, GNOME Shell extensions run on GJS (GNOME JavaScript), not Node.js, which requires specific consideration for:
- Build tools are development dependencies only
- No runtime dependency on node_modules
- GJS-specific type definitions needed
- Different module system (imports vs ESM, depending on GNOME Shell version)

## Requirements

### Functional Requirements
- Compile TypeScript source files to JavaScript
- Maintain compatibility with GNOME Shell 42 (current target version)
- Support type checking during development
- Enable incremental adoption (can keep some .js files while migrating)

### Technical Requirements
- Install TypeScript compiler and required type definitions
- Configure tsconfig.json for GJS environment
- Set up source directory structure (src/ for TypeScript, root for compiled JS)
- Create build scripts for compilation
- Update .gitignore to exclude compiled files and node_modules
- Configure package.json with appropriate scripts

### Non-functional Requirements
- Minimal impact on build time
- Clear separation between development and distribution files
- Easy to understand for other developers
- Well-documented build process

## Implementation Plan

### Phase 1: Initial Setup
- Initialize npm project (package.json)
- Install TypeScript and related dependencies
- Install GJS type definitions (@types/gjs)
- Install GNOME Shell type definitions (@girs/gnome-shell for version 42)
- Create src/ directory for TypeScript source files
- Create dist/ directory for build output
- Move metadata.json to dist/ directory

### Phase 2: Configuration
- Create tsconfig.json with GJS-compatible settings
  - Target: ES2020 (SpiderMonkey 91 compatibility)
  - Module system: CommonJS (for GNOME 42 compatibility)
  - Output directory: dist/
  - Type checking options
  - Source map generation for debugging
- Update .gitignore to exclude:
  - node_modules/
  - dist/*.js (compiled JavaScript files)
  - dist/*.js.map (source maps)
- Create package.json scripts:
  - build: Compile TypeScript to JavaScript
  - watch: Watch mode for development
  - clean: Remove compiled files from dist/

### Phase 3: Source Migration
- Create src/extension.ts as TypeScript version of extension.js
- Migrate existing extension.js code to TypeScript
- Add type annotations for:
  - Extension class properties
  - Method parameters and return types
  - GJS/GNOME Shell API usage
- Test compilation
- Verify generated JavaScript works correctly

### Phase 4: Build Integration and Documentation
- Test compilation process
- Verify generated extension.js is functionally identical
- Test extension installation and execution
- Create build script if needed (Makefile or shell script)
- Create docs/guides/05-typescript-build.md documenting:
  - How to build the project (npm run build)
  - How to watch for changes (npm run watch)
  - How to test the extension
  - How to create distribution ZIP
- Update README.md with:
  - Link to docs/guides/05-typescript-build.md
  - Brief overview of the project structure
  - Quick start instructions

### Phase 5: Quality Tools (Optional Enhancement)
- Install Biome for linting and formatting
- Configure biome.json for TypeScript and JavaScript
- Add Biome scripts to package.json:
  - lint: Run Biome linter
  - format: Run Biome formatter
  - check: Run both linting and formatting checks

## Implementation Details

### Required npm Packages

Development dependencies:
```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/gjs": "^1.70.0",
    "@girs/gnome-shell": "^42.0.0",
    "@girs/st": "^42.0.0",
    "@girs/clutter": "^42.0.0",
    "@biomejs/biome": "^1.9.0"
  }
}
```

Note: Biome is optional for Phase 5.

### tsconfig.json Configuration

Key settings for GJS compatibility:
- `target`: "ES2020" (SpiderMonkey 91 in GNOME 42 supports ES2020 and most ES2021 features)
- `module`: "commonjs" (for GNOME 42 - check if ESM is needed for 45+)
- `lib`: ["ES2020"] (no DOM types)
- `outDir`: "dist" (build output directory for distribution)
- `rootDir`: "./src"
- `strict`: true (enable all strict type checking)
- `esModuleInterop`: true
- `skipLibCheck`: true (for faster compilation)

Note: GNOME 42 uses SpiderMonkey 91 (Firefox ESR 91), which fully supports ES2020 and most ES2021 features. ES2020 is the recommended target for maximum compatibility.

### Directory Structure

After setup:
```
project-root/
├── src/
│   └── extension.ts        (TypeScript source)
├── dist/                   (Build output - distribution ready)
│   ├── extension.js        (Compiled from src/extension.ts)
│   ├── extension.js.map    (Source map for debugging)
│   └── metadata.json       (Extension metadata - edited directly here)
├── node_modules/           (Development dependencies - not distributed)
├── package.json
├── tsconfig.json
├── .gitignore
└── docs/
```

Note: metadata.json is located directly in dist/ and version controlled. Only compiled .js files and .map files are excluded from git.

### .gitignore Updates

Add:
```
node_modules/
dist/*.js
dist/*.js.map
```

Note: dist/metadata.json and other static files in dist/ are version controlled.

### Build Commands

package.json scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "clean": "rm -f dist/*.js dist/*.js.map",
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check ."
  }
}
```

Note: Biome scripts (lint, format, check) are for Phase 5 (optional).

### Distribution Process

After building, the dist/ directory contains everything needed for distribution:
```bash
# Build
npm run build

# Create distribution ZIP
cd dist
zip -r ../snappa@x7c1.github.io.zip .
cd ..

# Install for testing
gnome-extensions install snappa@x7c1.github.io.zip --force
```

### Documentation

Create comprehensive documentation for the TypeScript build process:

**docs/guides/05-typescript-build.md** should include:
- Building the extension (`npm run build`)
- Development with watch mode (`npm run watch`)
- Testing changes (disable/enable extension workflow)
- Creating distribution packages
- Integration with existing development workflow

**README.md** should include:
- Project overview and purpose
- Link to build guide (docs/guides/05-typescript-build.md)
- Quick start instructions
- Directory structure explanation
- Links to other relevant documentation

## Timeline (Estimates in Points)

- Phase 1: 1 point
  - Install dependencies
  - Create directory structure
- Phase 2: 2 points
  - Configure tsconfig.json
  - Set up package.json scripts
  - Update .gitignore
- Phase 3: 3 points
  - Migrate extension.js to TypeScript
  - Add type annotations
  - Test compilation
- Phase 4: 3 points
  - Integration testing
  - Build script creation
  - Documentation creation (guide and README)
- Phase 5: 1 point (optional)
  - Biome setup
  - Configure linting and formatting

**Total: 9 points (10 points with optional Phase 5)**

## Risks and Mitigation

### Risk: Type Definition Incompatibilities
- **Description**: Type definitions for GNOME Shell APIs may not perfectly match actual API
- **Mitigation**: Use type assertions when needed, report issues to type definition maintainers

### Risk: Build Process Complexity
- **Description**: Additional build step may slow down development workflow
- **Mitigation**: Use watch mode (`tsc --watch`) during development, document clear workflow

### Risk: Wrong Module System
- **Description**: GNOME 42 uses old imports system, newer versions use ESM
- **Mitigation**: Verify current GNOME Shell version's module system, configure tsconfig accordingly

### Risk: Type Definition Packages Not Found
- **Description**: Exact package names/versions for GNOME 42 might not exist
- **Mitigation**: Research available type definition packages, may need to create custom type declarations

## Success Criteria
- TypeScript compiles successfully without errors
- Extension loads and works correctly in GNOME Shell
- Type checking catches potential errors during development
- Build process is well-documented and easy to use
- Development workflow is smooth with watch mode

## Notes
- This setup is for development time only - node_modules is never distributed
- The compiled extension.js is what runs in GNOME Shell
- Type definitions are for development support only
- **Distribution directory**: dist/ contains all files needed for distribution
  - metadata.json is located in dist/ and version controlled
  - Only .js and .js.map files in dist/ are excluded from git
  - dist/ can be directly zipped for distribution
- **No bundler needed**: webpack/vite/rollup are unnecessary for this project
  - TypeScript compiler (tsc) alone is sufficient
  - GNOME Shell extensions do not use external npm packages at runtime
  - Only GNOME Shell APIs are used
  - Bundlers are only needed for advanced cases with external libraries (see docs/learning/build-and-distribution.md)
- Consider future migration to ESM if upgrading to GNOME Shell 45+
- May need to adjust TypeScript version or type definition packages based on availability

## References
- docs/learning/build-and-distribution.md - Understanding GJS vs Node.js
- docs/guides/03-development-workflow.md - Current development workflow
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [GJS Documentation](https://gjs.guide/)
- [GNOME 42 to depend on SpiderMonkey 91](https://discourse.gnome.org/t/gnome-42-to-depend-on-spidermonkey-91/8665)
- [SpiderMonkey Newsletter (Firefox 90-91)](https://spidermonkey.dev/blog/2021/07/19/newsletter-firefox-90-91.html)
- [ECMAScript 2016+ compatibility table](https://compat-table.github.io/compat-table/es2016plus/)

