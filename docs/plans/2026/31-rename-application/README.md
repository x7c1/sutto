# Rename Application from Snappa to Sutto

Status: Completed

## Overview

Rename the application from "snappa" to "sutto" to avoid conflicts with existing applications. This plan covers all layers: package metadata, code identifiers, file paths, GSettings schemas, documentation, build/deployment scripts, and GitHub repository name. See [adr.md](./adr.md) for the name selection rationale.

## Background

- The current name "snappa" conflicts with existing applications
- The name appears in 60+ files across all layers of the project

## Scope

All occurrences of "snappa" must be renamed. The changes are grouped into the following categories:

### 1. Package Metadata
- `package.json` — name, repository URL, bugs URL, homepage
- `package-lock.json` — auto-regenerated after package.json change
- `dist/metadata.json` — uuid, name, url

### 2. GSettings Schema
- `dist/schemas/org.gnome.shell.extensions.snappa.gschema.xml`
  - File rename required
  - Schema ID: `org.gnome.shell.extensions.snappa`
  - Schema path: `/org/gnome/shell/extensions/snappa/`

### 3. Source Code Identifiers
- `src/infra/constants.ts`
  - `EXTENSION_UUID` (`snappa@x7c1.github.io`)
  - Data file names (`history.snappa.jsonl`, `monitors.snappa.json`, etc.)
- `src/prefs.ts`
  - `SCHEMA_ID` (`org.gnome.shell.extensions.snappa`)
  - Class name `SnappaPreferences`
  - Log prefix `[Snappa Prefs]`
- `src/ui/main-panel/renderer.ts`
  - CSS class `snappa-settings-icon`
- `src/infra/glib/preferences-repository.ts`
  - Schema lookup string

### 4. Build Configuration
- `esbuild.config.js` — GSettings schema path reference
- `scripts/copy-files.sh` — `EXTENSION_UUID` variable

### 5. Environment Configuration
- `.envrc.example` — example URLs containing "snappa"

### 6. IDE Configuration
- `.idea/snappa.iml` — file rename
- `.idea/modules.xml` — module reference
- `.idea/workspace.xml` — path references

### 7. Demo/Automation Scripts
- `docs/plans/2026/9-demo-gif-generation/demo/` — VM names, hostnames, script references

### 8. GitHub Actions / CI Workflows
- `.github/workflows/` — verify for hardcoded repository URLs and update if present

### 9. Documentation (40+ files)
- `docs/guides/` — command examples, installation instructions, architecture docs
- `docs/plans/` — planning documents across 2025 and 2026 (**all past plans are also renamed; this is an exception to the usual rule of not modifying past plans**)
- `docs/concepts/` — concept documentation
- `docs/learning/` — learning notes

### Out of Scope
- `claude.local/` — session data and local config; not tracked in git, no need to update

## Backward Compatibility

No backward compatibility is required. There are no existing users of snappa, so all references can be replaced directly without migration strategies, fallback logic, or deprecation periods.

## Implementation Order

- **Phase 1: Core rename** (single commit)
  - Package metadata
  - GSettings schema (file rename + content)
  - Source code identifiers (constants, class names, CSS classes)
  - Build configuration
  - Environment configuration
  - GitHub Actions / CI workflows
  - Verify build, check, and test pass
- **Phase 2: Documentation** (single commit)
  - Update all documentation files
  - Update demo/automation scripts
- **Phase 3: IDE and development files** (single commit)
  - Update IDE configuration
- **Phase 4: GitHub repository rename** (after all commits are pushed)
  - `gh repo rename sutto`
  - `git remote set-url origin` to update local remote URL

## Timeline

- Phase 1: 3 points
- Phase 2: 2 points
- Phase 3: 1 point
- Phase 4: 1 point
- **Total: 7 points**

## Priority

High.

## Risks

None. There are no existing users or contributors, so the rename has no external impact.
