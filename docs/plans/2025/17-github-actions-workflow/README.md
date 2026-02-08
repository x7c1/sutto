# GitHub Actions Workflow Integration

Status: Completed

## Overview
Add GitHub Actions workflows to automate CI/CD pipeline for the GNOME Shell extension project. This includes automated checks for pull requests and automated release packaging when merging to main branch.

## Requirements

### Functional Requirements
- Automated code quality checks on pull requests
  - Lint checking
  - Format checking
  - Type checking
  - Test execution
- Automated release packaging on main branch merge
  - Build verification
  - Extension packaging (.zip file creation)
  - GitHub Release creation
- Start with minimal configuration

### Technical Requirements
- Use Node.js version matching development environment
  - Current development environment: Node.js v24.11.1
  - CI/CD should use: `node-version: '24.x'`
  - Rationale: Keep development and CI/CD environments consistent to avoid version-specific issues
- No Docker container needed (if build works without it)
- Two separate workflows:
  - PR workflow: runs on pull request pushes
  - Main workflow: runs on merge to main branch

## Current Situation

### Existing Build Process
- TypeScript compilation to `dist/` directory
- Build outputs:
  - `extension.js`
  - `prefs.js`
  - `metadata.json`
  - `schemas/` directory
- Available npm scripts:
  - `npm run check`: Biome lint and format check
  - `npm run build`: Development build (TypeScript compilation)
  - `npm run build:release`: Production build (with BUILD_MODE=release)
  - `npm run test:run`: Test execution

### Challenges
- Manual code quality checks are needed
- Release process not yet established
- GNOME Extension release procedure unclear

## GNOME Extension Release Process

### Standard Release Flow
- Build extension to `dist/` directory
- Package **all contents** of `dist/` directory into `.zip` file
  - Naming convention: `<uuid>.v<version>.shell-extension.zip`
  - UUID from `metadata.json`: `sutto@x7c1.github.io`
  - Example: `sutto@x7c1.github.io.v2.shell-extension.zip`
- Upload to GitHub Releases
- (Future) Automatic upload to extensions.gnome.org

### References
- [Anatomy of an Extension | GNOME JavaScript](https://gjs.guide/extensions/overview/anatomy.html) - Official guide for GNOME Shell extension structure and UUID format
- [Manually install a Gnome Shell Extension from a ZIP file - PragmaticLinux](https://www.pragmaticlinux.com/2021/06/manually-install-a-gnome-shell-extension-from-a-zip-file/) - Detailed explanation of extension installation and zip file naming convention

### Current Version Management
- `metadata.json` contains version field (currently version: 1)
- Version should be incremented for releases
- Consider syncing with `package.json` version

## Implementation Plan

### Phase 1: CI Workflow (pr.yml)
- Create `.github/workflows/pr.yml`
- Implement check job:
  - Setup Node.js v24.x (matching development environment)
  - Install dependencies with `npm ci`
  - Run `npm run check` (Biome)
  - Run `npm run build` (TypeScript)
  - Run `npm run test:run` (Tests)
- Trigger on:
  - Push to all branches (including main)
  - Pull request events

### Phase 2: Release Workflow (release.yml)
- Create `.github/workflows/release.yml`
- Implement release job:
  - Trigger after pr.yml completes successfully
  - Only run on main branch
  - Detect version change in `metadata.json`
  - Build extension using `npm run build:release` (production build)
  - Package `dist/` directory to zip file with GNOME Extension naming convention
  - Zip file naming: `<uuid>.v<version>.shell-extension.zip`
    - Example: `sutto@x7c1.github.io.v2.shell-extension.zip`
  - Generate changelog automatically from PRs and commits
  - Create GitHub Release with zip artifact and changelog
- Use `workflow_run` event to depend on pr.yml:
  ```yaml
  on:
    workflow_run:
      workflows: ["CI"]  # Name from pr.yml
      types:
        - completed
      branches:
        - main
  ```
- Add conditions to control release:
  ```yaml
  jobs:
    release:
      if: ${{ github.event.workflow_run.conclusion == 'success' }}
      steps:
        - name: Check if version changed
          id: version-check
          run: |
            # Get version and UUID from current commit
            CURRENT_VERSION=$(jq -r '.version' dist/metadata.json)
            UUID=$(jq -r '.uuid' dist/metadata.json)

            # Get version from previous commit
            git checkout HEAD~1
            PREVIOUS_VERSION=$(jq -r '.version' dist/metadata.json)
            git checkout -

            if [ "$CURRENT_VERSION" != "$PREVIOUS_VERSION" ]; then
              echo "changed=true" >> $GITHUB_OUTPUT
              echo "version=$CURRENT_VERSION" >> $GITHUB_OUTPUT
              echo "uuid=$UUID" >> $GITHUB_OUTPUT
            else
              echo "changed=false" >> $GITHUB_OUTPUT
            fi

        - name: Build Extension
          if: steps.version-check.outputs.changed == 'true'
          run: npm run build:release

        - name: Package Extension
          if: steps.version-check.outputs.changed == 'true'
          run: |
            UUID="${{ steps.version-check.outputs.uuid }}"
            VERSION="${{ steps.version-check.outputs.version }}"
            cd dist
            zip -r ../${UUID}.v${VERSION}.shell-extension.zip .
            cd ..

        - name: Create Release
          if: steps.version-check.outputs.changed == 'true'
          # Create GitHub Release using detected version
  ```

### Release Control Strategy
- Version-based Release Detection:
  - `metadata.json` contains integer version field (1, 2, 3...)
  - Release is triggered only when version number increases
  - No manual git tag operation required
  - Version change is visible and reviewable in PR
- Benefits:
  - Single source of truth for version (`metadata.json`)
  - Type-safe (integer value, no typo risk)
  - Clear version history in git commits
  - Automatic release on version bump
- Workflow for releasing:
  - Increment version in `metadata.json` (e.g., 1 → 2)
  - Create PR and review version change
  - Merge to main → automatic release creation

### Git Tag and GitHub Release Relationship
- GitHub Release is typically associated with a git tag
- GitHub Actions automatically creates both tag and release:
  - Actions detects version change (e.g., `version: 2`)
  - Actions creates git tag (e.g., `v2`) automatically
  - Actions creates GitHub Release linked to that tag
  - Actions attaches zip file to the release
- No manual `git tag` command execution required
- All operations are automated by GitHub Actions
- Release creation example:
  ```yaml
  - name: Create Release
    uses: softprops/action-gh-release@v1
    with:
      tag_name: v${{ steps.version-check.outputs.version }}
      name: Release ${{ steps.version-check.outputs.version }}
      files: ${{ steps.version-check.outputs.uuid }}.v${{ steps.version-check.outputs.version }}.shell-extension.zip
      generate_release_notes: true  # Automatically generate changelog from PRs and commits
  ```
- Changelog generation:
  - Uses GitHub's built-in release notes generator
  - Automatically lists PRs and commits since last release
  - Includes contributor information
  - No additional configuration required

### Workflow Sequence on Main Merge
- Execution order when merging to main branch:
  - Step 1: `pr.yml` runs (checks code quality)
  - Step 2: If pr.yml succeeds → `release.yml` runs (creates release)
  - Step 3: If pr.yml fails → release.yml does not run

### Phase 3: Release Documentation
- Create `docs/guides/08-release-workflow.md`
- Document the release process:
  - How to create a new release
  - Version increment procedure
  - What happens automatically
  - Troubleshooting common issues
- Content to include:
  - Step-by-step release instructions
  - Explanation of version-based release detection
  - GitHub Release and git tag relationship
  - How to verify successful release
  - How to rollback if needed

### Future Enhancements (Out of Scope)
- Automatic version bumping
  - Read PR description checkbox to trigger version increment
  - Example: `- [x] release package after this pr merged`
  - Workflow automatically commits updated `metadata.json` after PR merge
  - Eliminates manual version number updates
- Upload to extensions.gnome.org

## Timeline
- Phase 1 (CI Workflow): 2 points
  - Workflow file creation
  - Testing and verification
- Phase 2 (Release Workflow): 3 points
  - Workflow file creation
  - Version detection logic
  - Packaging script
  - Release automation setup
  - Testing and verification
- Phase 3 (Documentation): 1 point
  - Release guide creation
  - Review and refinement

## Success Criteria
- PR workflow runs successfully on all pull requests
- All checks (lint, format, type, test) must pass
- Release workflow only triggers when version in metadata.json changes
- Git tag is automatically created with correct version number
- GitHub Release is created with:
  - Extension zip file with correct naming convention
  - Auto-generated changelog from PRs and commits
- Release documentation (`docs/guides/08-release-workflow.md`) is complete and clear
- Team can understand and maintain workflows
- Team can perform releases following the documented procedure
