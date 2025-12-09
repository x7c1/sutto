# Release Workflow

## Overview

This guide explains the automated release process for the GNOME Shell extension. Releases are triggered automatically when the version number in `dist/metadata.json` is incremented and merged to the main branch. The workflow creates a GitHub Release with a packaged extension zip file and auto-generated changelog.

## Release Process

### 1. Increment Version

Edit the version field in `dist/metadata.json`:

```json
{
  "uuid": "snappa@x7c1.github.io",
  "name": "Snappa",
  "version": 2
}
```

The version is an integer value. Increment it by 1 for each release (e.g., 1 → 2 → 3).

### 2. Create Pull Request

Create a PR with the version change:

```bash
git checkout -b release-v2
git add dist/metadata.json
git commit -m "chore: bump version to 2"
git push origin release-v2
```

### 3. Review and Merge

- PR checks will run automatically (lint, build, tests)
- Review the changes and version increment
- Merge to main branch when ready

### 4. Automatic Release

After merging to main:

1. CI workflow runs (lint, build, tests)
2. Release workflow detects version change
3. Extension is built in production mode
4. Extension is packaged as `snappa@x7c1.github.io.v2.shell-extension.zip`
5. Git tag `v2` is created automatically
6. GitHub Release is created with:
   - Extension zip file
   - Auto-generated changelog from PRs and commits

## What Happens Automatically

### CI Checks (pr.yml)

Runs on every push and pull request:

- Lint and format check (`npm run check`)
- TypeScript compilation and build (`npm run build`)
- Test execution (`npm run test:run`)

### Release Creation (release.yml)

Runs after CI completes successfully on main branch:

- **Version Detection**: Compares current and previous version in `dist/metadata.json`
- **Production Build**: Runs `npm run build:release` for optimized output
- **Extension Packaging**: Creates zip file with all contents of `dist/` directory
- **Git Tag Creation**: Automatically creates tag (e.g., `v2`)
- **GitHub Release**: Creates release with zip file and changelog

## Release Naming Convention

The extension zip file follows GNOME's naming convention:

```
<uuid>.v<version>.shell-extension.zip
```

Example: `snappa@x7c1.github.io.v2.shell-extension.zip`

Where:
- `<uuid>`: Extension UUID from `metadata.json`
- `<version>`: Version number from `metadata.json`

## Verifying Release

After merging:

1. Check GitHub Actions tab for workflow status
2. Verify both CI and Release workflows completed successfully
3. Check GitHub Releases page for new release
4. Download and verify the extension zip file

## Troubleshooting

### Release Not Triggered

**Problem**: Release workflow didn't run after merge.

**Solution**: Ensure version in `dist/metadata.json` was actually incremented. Check that:
- Previous commit had version `1`
- Current commit has version `2`
- Change is in main branch

### CI Checks Failed

**Problem**: Release workflow skipped because CI failed.

**Solution**: Fix CI issues first:
1. Run `npm run check` locally to fix lint/format issues
2. Run `npm run build` to ensure build succeeds
3. Run `npm run test:run` to verify tests pass
4. Push fixes to main branch

### Wrong Version Number

**Problem**: Released with incorrect version number.

**Solution**:
1. Increment version again in `dist/metadata.json`
2. Create new PR and merge to trigger new release
3. Old release can be deleted manually from GitHub Releases page

## Manual Testing Before Release

Before incrementing version, verify locally:

```bash
# Run all checks
npm run build && npm run check && npm run test:run

# Test extension installation
npm run build:release
cd dist
zip -r ../test-extension.zip .
gnome-extensions install ../test-extension.zip --force
```

## Future Enhancements

- Automatic version bumping based on PR labels
- Upload to extensions.gnome.org
- Release notes template with changelog categories
