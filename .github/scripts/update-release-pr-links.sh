#!/usr/bin/env bash
set -euo pipefail

# Update merged release PR description to use permanent tag links
# Usage: update-release-pr-links.sh <version>
#
# Replaces temporary branch references (release/vX) with permanent tag references (vX)
# in the PR description's compare links.

main() {
    local version="$1"
    local pr_number body

    pr_number=$(find_release_pr "$version")
    if [ -z "$pr_number" ]; then
        echo "No merged release PR found for v${version}"
        return 0
    fi

    echo "Updating PR #${pr_number} links..."

    body=$(gh pr view "$pr_number" --json body --jq '.body')
    body=$(echo "$body" | sed "s|\.\.\.release/v${version}|...v${version}|g")

    echo "$body" | gh pr edit "$pr_number" --body-file -
    echo "Done"
}

find_release_pr() {
    local version="$1"
    gh pr list --state merged --search "Release v${version} in:title" --json number --jq '.[0].number // empty'
}

main "$@"
