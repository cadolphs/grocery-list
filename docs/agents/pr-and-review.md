# PR bodies and review

How the mattpocock `pr` and `code-review` skills fit this repo's ship loop ([ship-pr skill](../../.claude/skills/ship-pr/SKILL.md)). The repo's template and gate win wherever a skill's default differs.

## PR body

Every PR body is [`.github/pull_request_template.md`](../../.github/pull_request_template.md), filled in and passed with `gh pr create --body-file`. The `PR hygiene` check (`scripts/check-pr-body.mjs`) fails any other shape, including the `pr` skill's Summary / Evidence / Merge Danger body.

Use the `pr` skill's techniques inside the template's sections:

| `pr` skill section | Goes under |
| --- | --- |
| Summary (pseudocode, call tree, file tree, diff sketch, mermaid) | **System recap**, below `Touches:` |
| Evidence (before / after) | **Testing**, next to the `npm run verify` and control CLI proof |
| Merge Danger: Door | the template's `Door:` line |
| Merge Danger: Blast Radius | `Risk:` (tier from `AGENTS.md`), with the blast radius in a **System recap** bullet when it is not obvious from the tier |

## Review

The gate is the [pr-review subagent](../../.claude/agents/pr-review.md), run by ship-pr step 2. Its passes count toward `maxLocalReviewPasses`.

The `code-review` skill is an optional extra pass when the maintainer asks for one; it does not replace pr-review. When running it:

- **Spec source**: the PR's **Intent**, then the linked issue, then the planning board item (`npm run board`). Specs live on the board, not under `docs/`.
- **Standards sources**: `AGENTS.md`, `docs/adrs/README.md` (the "no" table), `docs/primitives.md`, and `CLAUDE.md`.
- **Smell baseline**: the code is functional with no classes ([ADR-009](../adrs/ADR-009-no-classes-fp-only.md)). Turn class-shaped fixes into their functional form: Repeated Switches → one lookup map or discriminated-union handler both sites share; Feature Envy → move the function into the module that owns the data; Refused Bequest → does not apply.
