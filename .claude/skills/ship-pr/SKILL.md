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
2. Run `npx kcd-skills@latest autopilot ship-pr <pr-number> --risk <tier> --json`
   (reads state with `gh`; config in `.github/ship-pr.json`).
3. Do the one action it returns: fix CI, address review threads (fix, or reply
   with why), resolve conflicts, mark ready, merge, or wait. Any changed test
   expectation needs a reason in the PR body.
4. Repeat step 2 until it says `merge`, `parked`, or `done`. Add `--merge` only
   for **low** risk. With no AI reviewer configured, medium and high end in
   `park` ("no reviewer configured"): request the maintainer's review and stop;
   they merge.
5. Before asking for merge, prove the change with the
   [control CLI](../control-grocery-list/SKILL.md) and cite the commands under
   **Testing**. After merge the deploy check waits for
   `npm run control -- health --sha <merge-sha>`.
6. File leftover friction ([friction-log](../friction-log/SKILL.md)) and
   `Cleanup:` issues, each with a `P0`-`P3` label and `needs-decision` when it
   needs the maintainer. If nothing was worth filing, add the
   `friction-skipped` label to the PR. Do one or the other on every PR, and
   fill the template's **Friction** line to match. Anything you worked around
   to get proof (a missing browser, missing credentials, a blocked host) is
   friction: file it, do not only mention it under **Testing**.
7. Summarize in the PR (final comment): what shipped, risk, links, what is
   left.

Steps 6 and 7 apply in every environment, including cloud sessions and PRs
that end parked for the maintainer.
