---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
max_refine_rounds: 3
retries_remaining: 1
check_command: "python3 -c \"import yaml,sys; c=yaml.safe_load(open('.github/dependabot.yml')); npm=[u for u in c['updates'] if u['package-ecosystem']=='npm'][0]; ok=any(i.get('dependency-name')=='@girs/*' and i.get('update-types')==['version-update:semver-major'] for i in npm.get('ignore',[])); others=[u for u in c['updates'] if u['package-ecosystem']!='npm' and u.get('ignore')]; sys.exit(0 if ok and not others else 1)\""
assignee: null
branch: task/1125-1811-keep-dependabot-off-the-girs-5x-line
created_at: 2026-11-25T18:11:25Z
updated_at: 2026-11-25T18:13:46Z
---

# ci(dependabot): ignore major updates of the @girs type packages

## Overview

The extension targets GNOME Shell 50, and its `@girs/*` type packages stay on
the line that describes that Shell: `@girs/gnome-shell` 50.x and the other
`@girs` packages on 4.x. The 5.x line (and `@girs/gnome-shell` 51.x) describes
GNOME Shell 51; types for another Shell let code call an API the targeted Shell
does not have and still compile. The packages move to the next line in the
change that adds support for that Shell, together with `shell-version`
(`docs/guides/05-typescript-build.md`, "Where types come from").

Dependabot does not know this rule and opens a major update for each `@girs`
package whenever a new line appears, which can only be closed by hand.

Add an `ignore` entry to the `npm` update in `.github/dependabot.yml` that
skips `version-update:semver-major` for `@girs/*`, with a short comment giving
the reason and pointing at the guide section above. Minor and patch updates of
`@girs` keep arriving in the grouped `npm-minor-and-patch` pull request.
Leave the other ecosystems and the rest of the file unchanged.

## Acceptance criteria

### Automated (pipeline-verified)

- [x] The `npm` update in `.github/dependabot.yml` ignores
      `version-update:semver-major` for `@girs/*`, and no other ecosystem
      gains an `ignore`.
