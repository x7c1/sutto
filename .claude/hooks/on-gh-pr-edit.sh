#!/bin/bash

# PreToolUse hook for gh pr edit
# Provides PR update rules

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/pr-rules.sh"

main() {
    local input command

    input=$(cat)
    command=$(echo "$input" | jq -r '.tool_input.command // empty')

    # Only process gh pr edit commands
    if ! echo "$command" | grep -qE '^gh pr edit'; then
        exit 0
    fi

    print_update_rules

    exit 0
}

print_update_rules() {
    cat << 'EOF'
## PR Update Rules

### IMPORTANT: Preserve Existing Content
Before updating, ALWAYS read the current PR description first:
```
gh pr view <number> --json body -q '.body'
```

- Preserve checkbox states (checked/unchecked)
- Only modify or append what's necessary
- Do NOT overwrite the entire body

EOF
    print_full_template
    echo ""
    print_labels_rules
}

main
