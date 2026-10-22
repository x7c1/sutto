# Release Workflow

## Overview

Releases run through [colophon](https://github.com/x7c1/colophon)'s reusable workflows. Every push to `main` keeps one release PR titled `Release vX.Y.Z` up to date; merging it publishes a GitHub Release with the packaged extension once CI passes on the merge commit. The version shown to users is a semver string shared with Sutto for macOS, written to `version-name` in `dist/metadata.json`, while the integer `version` that extensions.gnome.org requires grows by one with every release.

## Versions

- Releases are `vX.Y.Z`. Tags up to `v7` were integers; colophon reads `v7` as `7.0.0`, so `v8.0.0` follows it as a major bump
- The minor version marks a milestone of the product, shared with Sutto for macOS. The patch version is per client, so a fix for GNOME alone is released as the next patch here only
- `version-name` in `dist/metadata.json` is what the Extensions app and extensions.gnome.org show. `version` is an internal counter and is not kept equal to the major version

## Releasing

1. **Find the release PR.** It is labelled `release` and titled `Release v<next>`, where the default is the next patch. Its branch is `main` plus one commit that writes `version-name` and `version` to `dist/metadata.json`
2. **Pick the version.** To release a minor or major instead of a patch, edit the PR title (for example `Release v8.0.1` → `Release v8.1.0`). The release PR workflow rewrites the branch for the new version. The validate check rejects titles that skip a version
3. **Write the summary.** Replace the placeholder above the `<!-- changelog:auto -->` marker in the PR body and delete the `<!-- release-summary:todo -->` comment. The summary becomes the GitHub Release body; the changelog below the marker is regenerated on every push to `main`
4. **Check CI.** The release PR is opened by the GitHub App whose Client ID and private key are registered as the `RELEASE_APP_CLIENT_ID` variable and the `RELEASE_APP_PRIVATE_KEY` secret, so CI and the validate check run on every refresh. Without them, the PR is opened with `GITHUB_TOKEN`, which starts no CI: close and reopen the PR to run the checks on its latest commit. Setting up the App is described in colophon's [usage guide](https://github.com/x7c1/colophon/blob/main/docs/usage.md#tokens)
5. **Merge.** Squash-merge the PR. When CI passes on the merge commit, the Release workflow builds the extension with the production settings, tags the commit `vX.Y.Z`, and publishes the GitHub Release with `sutto@x7c1.github.io.vX.Y.Z.shell-extension.zip` attached

## Workflows

| Workflow | Runs on | Does |
|---|---|---|
| `release-pr.yml` | push to `main`, release PR title edits, manual dispatch | Opens or refreshes the release PR |
| `validate-release-pr.yml` | pull requests | Checks a release PR's title and summary; other PRs pass |
| `release.yml` | CI completing on `main` | Builds and packages the extension, then tags and publishes the release |

The colophon workflows are pinned by commit SHA. See colophon's [usage guide](https://github.com/x7c1/colophon/blob/main/docs/usage.md) for their inputs.

## Troubleshooting

- **No release was published after merging**: check that CI passed on the merge commit and that the Release workflow's `plan` job found the release PR. A release PR whose body has no summary fails `plan` before anything is tagged; write the summary and re-run the workflow
- **The release PR workflow failed**: an edited title that skips a version is rejected. Fix the title and the next run refreshes the PR
- **A build or upload step failed**: re-run the Release workflow. An existing release is kept, and the zip is replaced

## Manual Testing Before Release

```bash
npm run build && npm run check && npm run test:run

npm run build:release
cd dist
zip -r ../test-extension.zip .
gnome-extensions install ../test-extension.zip --force
```
