---
name: ship-pr
description:
  Shepherd a pull request to merged or parked. Use when a PR is ready to
  finish, and for every change once it is on a branch.
---

# Ship PR

1. Work on a branch, never `main` (ADR-010). Fill
   `.github/pull_request_template.md`, including Risk from the tiers in
   `AGENTS.md`.
2. After `npm run verify` is green and before marking the PR ready, run the
   [pr-review subagent](../../agents/pr-review.md) on `git diff main...HEAD`
   (skip for docs-only or generated-file changes). Fix each finding, or answer
   it in the PR body.
3. Run `npx kcd-skills@latest autopilot ship-pr <pr-number> --risk <tier> --json`
   (reads state with `gh`; config in `.github/ship-pr.json`).
4. Do the one action it returns: fix CI, address review threads (fix, or reply
   with why), resolve conflicts, mark ready, merge, or wait. Any changed test
   expectation needs a reason in the PR body.
5. Repeat step 3 until it says `merge`, `parked`, or `done`. Add `--merge` only
   for **low** risk. The Claude review workflow (`github-actions[bot]`) is the
   configured reviewer on every tier: the autopilot waits for its review, then
   asks you to fix or answer each thread. Medium and high then end in `park`
   (human approval): request the maintainer's review and stop; they merge.
6. Before asking for merge, prove the change with the
   [control CLI](../control-grocery-list/SKILL.md) and cite the commands under
   **Testing**. After merge the deploy check waits for
   `npm run control -- health --sha <merge-sha>`.
7. File leftover friction ([friction-log](../friction-log/SKILL.md)) and
   `Cleanup:` issues, each with a `P0`-`P3` label and `needs-decision` when it
   needs the maintainer. If nothing was worth filing, add the
   `friction-skipped` label to the PR. Do one or the other on every PR, and
   fill the template's **Friction** line to match. Anything you worked around
   to get proof (a missing browser, missing credentials, a blocked host) is
   friction: file it, do not only mention it under **Testing**.
8. Summarize in the PR (final comment): what shipped, risk, links, what is
   left.

Steps 7 and 8 apply in every environment, including cloud sessions and PRs
that end parked for the maintainer.
