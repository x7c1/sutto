---
status: completed
pipeline_phase: null
plan: null
base_ref: null
perspectives: null
max_refine_rounds: 3
retries_remaining: 1
check_command: python3 -c 'import glob,subprocess as s,yaml;J=[(k,j) for f in sorted(glob.glob(".github/workflows/*.yml")) for k,j in (yaml.safe_load(open(f)).get("jobs") or {}).items() if k.endswith("-green")];R=lambda st,r:s.run(["bash","-ec",st["run"]],env={"RESULTS":r,"PATH":"/usr/bin:/bin"},stdout=s.DEVNULL).returncode;assert J;assert all("if" not in st and R(st,"success skipped")==0 and R(st,"skipped")==0 and all(R(st,"success "+b)!=0 for b in ("failure","cancelled","abandoned")) for k,j in J for st in j["steps"] if "run" in st);print(len(J),"aggregate job(s) ok")' && ! grep -rnE '\[ "\$result" = cancelled \]|contains\(needs\.\*\.result' .github/workflows/
assignee: null
branch: task/1116-0303-fail-all-green-unless-every-job-succeeded-or-was-skipped
created_at: '2026-11-15T18:03:50Z'
updated_at: 2026-11-15T18:11:00Z
---

# ci: pass all-green only when every needed job succeeded or was skipped

## Overview

The aggregate job `all-green` in `.github/workflows/` is the required check that sums up the results of the jobs in its `needs`. It currently fails only when a result is `failure` or `cancelled`, and passes on anything else. GitHub Actions can report a result that is neither for a job it abandoned because no runner picked it up, and `all-green` then turns green as if the job that never ran had passed.

Invert the test to list what is allowed: pass only when every value of `needs.*.result` is `success` or `skipped`, and fail on anything else (`failure`, `cancelled`, or any other value). A job skipped by its condition (`skipped`) still does not count as a failure. Use the step below, and bring the step name and any nearby comment that says the job fails on a failure or a cancellation in line with the new rule. Leave the `needs` lists and the jobs' `if:` conditions as they are.

```yaml
    steps:
      - name: Fail unless every job succeeded or was skipped
        env:
          RESULTS: ${{ join(needs.*.result, ' ') }}
        run: |
          echo "needs results: $RESULTS"
          for result in $RESULTS; do
            case "$result" in
              success | skipped) ;;
              *) exit 1 ;;
            esac
          done
```

## Acceptance criteria

### Automated (pipeline-verified)

- [x] For every aggregate job in `.github/workflows/` (a job whose key ends in `-green`), its `run` script exits 0 when `RESULTS` is `success skipped` or `skipped`, and non-zero when it is `success failure`, `success cancelled` or `success abandoned`; the step carries no `if:` (the python check in `check_command`)
- [x] No workflow under `.github/workflows/` keeps the old form that names only `cancelled` and `failure` (`[ "$result" = cancelled ]`, `contains(needs.*.result, ...)`) (the grep in `check_command`)
