---
name: friction-log
description:
  File a friction issue for a durable papercut hit while working. Use after
  every PR (ship-pr step 6) and whenever tooling, docs, or tests slowed you
  down.
---

# Friction log

1. Search first: `gh issue list --label friction --state open --search "<words>"`.
   Comment on a match instead of filing a duplicate.
2. File only if it is durable (still true tomorrow), recurring, reproducible,
   and owned by this repo. One papercut per issue. No secrets or user data.
3. File with the form fields and a priority:

   ```sh
   gh issue create --template friction.yml   # interactive, or:
   gh issue create --title "<papercut>" --label friction --label P2 \
     --body "$(cat <<'BODY'
   ### What happened
   ### What you expected or wanted
   ### How to reproduce
   ### Cost (time, retries, wrong output)
   ### Relevant files or commands
   BODY
   )"
   ```

   Priority: `P0` broken now / blocking agents, `P1` costs time on most PRs,
   `P2` worth fixing, `P3` nice to have. Add `needs-decision` when the fix is a
   product or one-way-door call.
4. Nothing worth filing: label the PR `friction-skipped`.
