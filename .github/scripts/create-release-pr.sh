#!/usr/bin/env bash
set -euo pipefail

# Create or update a release PR based on changes since the last tag
# Usage: create-release-pr.sh <metadata_file>
#
# Environment variables:
#   GH_TOKEN - GitHub token for API access (required)
#
# Outputs to GITHUB_OUTPUT:
#   pr_number - The PR number (new or existing)
#   action    - "created", "updated", or "skipped"

METADATA_FILE="${1:-dist/metadata.json}"

main() {
    local pr_number current_version next_version last_tag changelog repo_url

    pr_number=$(check_existing_pr)
    read -r current_version next_version <<< "$(get_version_info)"
    last_tag=$(get_last_tag)
    repo_url=$(gh repo view --json url --jq '.url')
    changelog=$(generate_changelog "$last_tag" "$repo_url")

    if [ -n "$pr_number" ]; then
        update_release_pr "$pr_number" "$next_version" "$current_version" "$changelog" "$last_tag" "$repo_url"
        output "pr_number" "$pr_number"
        output "action" "updated"
    else
        ensure_release_label
        create_release_pr "$next_version" "$current_version" "$changelog" "$last_tag" "$repo_url"
        pr_number=$(check_existing_pr)
        output "pr_number" "$pr_number"
        output "action" "created"
    fi
}

check_existing_pr() {
    gh pr list --label "release" --state open --json number --jq '.[0].number // empty'
}

get_version_info() {
    local current next
    current=$(jq -r '.version' "$METADATA_FILE")
    next=$((current + 1))
    echo "$current $next"
}

get_last_tag() {
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

generate_changelog() {
    local last_tag="$1"
    local repo_url="$2"
    local log

    if [ -n "$last_tag" ]; then
        log=$(git log "${last_tag}..HEAD" --oneline --no-merges)
    else
        log=$(git log --oneline --no-merges -20)
    fi

    format_changelog "$log" "$repo_url"
}

format_changelog() {
    local log="$1"
    local repo_url="$2"
    local -A sections
    local -a section_order=(feat fix refactor docs chore other)
    local -A section_titles=(
        [feat]="Features"
        [fix]="Bug Fixes"
        [refactor]="Refactoring"
        [docs]="Documentation"
        [chore]="Chores"
        [other]="Other Changes"
    )

    # Initialize empty sections
    for key in "${section_order[@]}"; do
        sections[$key]=""
    done

    # Categorize each commit
    while IFS= read -r line; do
        [ -z "$line" ] && continue

        # Remove commit hash prefix
        local message="${line#* }"
        # Convert PR references to links
        message=$(echo "$message" | sed "s|#\([0-9]\+\)|[#\1](${repo_url}/pull/\1)|g")

        # Extract type from conventional commit format (type: or type(scope):)
        local type=""
        if [[ "$message" =~ ^([a-z]+)\(.*\): ]]; then
            type="${BASH_REMATCH[1]}"
        elif [[ "$message" =~ ^([a-z]+): ]]; then
            type="${BASH_REMATCH[1]}"
        fi

        case "$type" in
            feat|fix|refactor|docs|chore)
                sections[$type]+="- ${message}"$'\n'
                ;;
            *)
                sections[other]+="- ${message}"$'\n'
                ;;
        esac
    done <<< "$log"

    # Output sections in order
    local output=""
    for key in "${section_order[@]}"; do
        if [ -n "${sections[$key]}" ]; then
            output+="#### ${section_titles[$key]}"$'\n\n'
            output+="${sections[$key]}"$'\n'
        fi
    done

    echo "$output"
}

ensure_release_label() {
    gh label create release --description "Release PR" --color 0E8A16 2>/dev/null || true
}

create_release_pr() {
    local version="$1"
    local current_version="$2"
    local changelog="$3"
    local last_tag="$4"
    local repo_url="$5"
    local branch="release/v${version}"

    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    # Delete existing branch if it exists (from failed previous run)
    git push origin --delete "$branch" 2>/dev/null || true

    git checkout -b "$branch"

    jq ".version = ${version}" "$METADATA_FILE" > "${METADATA_FILE}.tmp"
    mv "${METADATA_FILE}.tmp" "$METADATA_FILE"

    git add "$METADATA_FILE"
    git commit -m "Release v${version}"
    git push origin "$branch"

    gh pr create \
        --title "Release v${version}" \
        --label "release" \
        --body "$(generate_pr_body "$version" "$current_version" "$changelog" "$last_tag" "$repo_url")"
}

update_release_pr() {
    local pr_number="$1"
    local version="$2"
    local current_version="$3"
    local changelog="$4"
    local last_tag="$5"
    local repo_url="$6"
    local branch="release/v${version}"

    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"

    # Rebase release branch onto latest main
    git fetch origin "$branch"
    git checkout "$branch"
    git rebase main

    # Re-apply version bump on top of latest main
    jq ".version = ${version}" "$METADATA_FILE" > "${METADATA_FILE}.tmp"
    mv "${METADATA_FILE}.tmp" "$METADATA_FILE"
    git add "$METADATA_FILE"
    git commit --amend --no-edit

    git push origin "$branch" --force-with-lease

    gh pr edit "$pr_number" \
        --body "$(generate_pr_body "$version" "$current_version" "$changelog" "$last_tag" "$repo_url")"
}

generate_pr_body() {
    local version="$1"
    local current_version="$2"
    local changelog="$3"
    local last_tag="$4"
    local repo_url="$5"
    local changes_header

    if [ -n "$last_tag" ]; then
        changes_header="[Changes since v${current_version}](${repo_url}/compare/${last_tag}...release/v${version})"
    else
        changes_header="Changes since v${current_version}"
    fi

    cat <<EOF
## Release v${version}

### ${changes_header}

${changelog}
EOF
}

output() {
    local key="$1"
    local value="$2"
    if [ -n "${GITHUB_OUTPUT:-}" ]; then
        echo "${key}=${value}" >> "$GITHUB_OUTPUT"
    fi
    echo "${key}=${value}"
}

main "$@"

