# grocery-list agent index

Grocery list app (Expo SDK 58, React Native + web, TypeScript strict) for one
household: staples library, trip sweep at home, store view by section, synced
through Firestore. Web deploys to https://grocery-list-cad.web.app from CI on
`main`. Functional, ports-and-adapters code — no classes.

`npm run verify` is the single local gate (install check, typecheck, lint, prettier check,
domain sibling-test check, feature-map check, dead-code check, script tests,
jest). CI runs the same command. Git hooks (simple-git-hooks, installed by `npm install`) run
lint + format of the staged files on commit and typecheck + map check + dead-code check on push.
Lint enforces no classes (ADR-009) and the layer boundaries; `knip`
(`npm run check:dead`) fails on unused files, exports, and dependencies.
A git worktree (agent worktrees live in `.claude/worktrees/`) has no
`node_modules` of its own: run `npm ci` in it first, or packages resolve from
the main checkout. `verify` fails fast on a missing or mismatched install
(`npm run check:install`, #102).

This file is a map. Open the page that owns the task:

- Setup, commands, testing, mutation testing: [CLAUDE.md](CLAUDE.md), [README.md](README.md)
- Architecture and primitives (compose these first): [docs/primitives.md](docs/primitives.md)
- Decisions, including what **not** to do: [docs/adrs/README.md](docs/adrs/README.md)
- Run and prove a change in the real app: [control-grocery-list skill](.claude/skills/control-grocery-list/SKILL.md), [docs/feature-map.md](docs/feature-map.md)
- Shipping a PR: [ship-pr skill](.claude/skills/ship-pr/SKILL.md)
- Review before a PR is marked ready: run the [pr-review subagent](.claude/agents/pr-review.md)
  on `git diff main...HEAD` after `npm run verify`, then fix each finding or
  answer it in the PR body. A fresh subagent, not the author's session, so it is
  not anchored on the author's reasoning. Skip for docs-only or generated-file
  changes. Review rounds are capped (`maxReviewRounds`, `maxLocalReviewPasses`
  in `.github/ship-pr.json`): at the cap the PR is parked for the maintainer
  with the `needs-decision` label, whatever the tier (ship-pr step 5).
- UI and visual design work: [userinterface-wiki skill](.claude/skills/userinterface-wiki/SKILL.md), 48 pruned rules on UX laws, typography and visual design (upstream: raphaelsalaja/userinterface-wiki, MIT)
- Designing an MCP server or AI integration (board item "Connect the list to an AI"): [mcp-design skill](.claude/skills/mcp-design/SKILL.md), 17 rules distilled from Luca Rossi's Refactoring essay on MCP servers
- Filing friction: [friction-log skill](.claude/skills/friction-log/SKILL.md). Every PR ends with a friction issue or the `friction-skipped` label, in every environment
- Deploy, health check, rollback: [docs/deploy.md](docs/deploy.md)
- Issue tracker, triage labels, and domain-doc rules the mattpocock engineering skills (`/triage`, `/to-tickets`, `/to-spec`, `/domain-modeling`) read: [docs/agents/](docs/agents/), summarised under **Agent skills** in [CLAUDE.md](CLAUDE.md)
- Feature and product work: ideas, open questions, decisions, and specs live as draft items on the [planning board](https://github.com/users/cadolphs/projects/4), not in issues; see [docs/planning-board.md](docs/planning-board.md) and the [planning-board skill](.claude/skills/planning-board/SKILL.md) (`npm run board`). No fixed workflow ([ADR-012](docs/adrs/ADR-012-no-mandated-feature-workflow.md)); `docs/feature/` and `docs/evolution/` are history

## Never

- No classes (ADR-009). No pushes to `main` (ADR-010). No production data
  access or manual deploys (ADR-011).

## Risk tiers

| Tier | What | Gate | Who merges |
| --- | --- | --- | --- |
| low | Docs, tests, refactors, UI or domain changes that compose existing primitives | CI green | agent |
| medium | Changes that extend a primitive's behavior or contract, storage/sync adapters, new dependencies | CI green + control CLI proof in **Testing** | human |
| high | `firestore.rules`, `src/auth/`, auth flows, `.github/workflows/`, `firebase.json`, `eas.json`, `app.json` | CI green + proof + human approval | human |

The `PR hygiene` check (`.github/workflows/pr-hygiene.yml`), which branch
protection must list as required next to `Commit Stage`, checks both the PR
template (`scripts/check-pr-body.mjs`, headings and fields read from
`.github/pull_request_template.md`) and that `Risk:` is not lower than the
changed paths imply (`scripts/check-risk-tier.mjs`). It re-runs on body edits
and label changes; CI (`Commit Stage`) runs only on code events, so a label
never starts a duplicate CI run (#73). Use `gh pr create --body-file` with the
template filled in, never a free-form body.

CI also fails on a high or critical `npm audit` advisory in shipped
dependencies (`--omit=dev`) unless it is in `.github/audit-allowlist.json`
with a reason and an expiry date (`scripts/check-audit.mjs`). Fix the
dependency first; an expired entry fails CI again, so each exception gets
rechecked. CI also runs weekly, since advisories appear without commits.

The Claude review workflow (`.github/workflows/claude-review.yml`, keyless via
workload identity) is **disabled** until the account has API credits (#89);
re-enable it with `gh workflow enable claude-review.yml` and restore the
`reviewers` in `.github/ship-pr.json`. Once enabled it reviews a PR when it is
marked ready; drafts, Dependabot and fork PRs are not reviewed. Until then the
pr-review subagent is the only pre-merge review. No preview environment is
configured. When unsure, pick the higher tier.

## Native builds

`npm run verify` never builds native code. Put the `eas-preview` label on a PR
that touches `package.json`, `package-lock.json`, `app.json`, `eas.json`, or
native config: `.github/workflows/eas-preview.yml` then starts an EAS Android
preview build and comments the build page link (`--no-wait`; check the result
on expo.dev before merging). It needs the maintainer's `EXPO_TOKEN` secret, so
a missing link means the secret, not the change. Agents apply the label
themselves when the rule matches.

## Dependency upgrades

`npx expo install --check` lists packages whose version differs from what the
Expo SDK expects; it is the upgrade list, not the installer. Runtime Expo and
React Native packages go through `npx expo install <pkg>@<expected>`. Dev-only
packages (TypeScript, Jest, `@types/*`, lint and format tools, knip, Stryker,
Playwright) go through `npm install -D <pkg>@<expected>`: `npx expo install`
writes them under `dependencies` and leaves the old devDependency behind
(#40). Done when `npx expo install --check` is clean and `npx -y expo-doctor`
reports 20/20.

## Issues and triage

Every issue agents file gets one priority label — `P0` (broken now), `P1`
(this week), `P2` (when nothing higher), `P3` (nice to have) — plus
`needs-decision` when it needs a product or one-way-door call. Work the
highest priority first; skip `needs-decision` issues until the maintainer
answers and removes the label.

A weekly code-health sweep (`.github/workflows/code-health.yml`, Monday,
keyless like the review) files at most one `Code health <date>` issue
(`cleanup` + `P3`): up to 10 verified findings on missed reuse, dead code
knip cannot see, the same logic in two layers, and convention drift no lint
rule covers, plus the size outliers `node scripts/check-complexity.mjs`
measures. Nothing is filed when nothing is new; an open `cleanup` issue by
the maintainer, a collaborator or the sweep suppresses repeats. Triage:
promote an accepted row to its own `Cleanup:` issue with the `cleanup` label
(the ship-pr step 7 convention, priority label as usual), strike dropped
rows, close the sweep issue when every row is handled.
