# grocery-list agent index

Grocery list app (Expo SDK 58, React Native + web, TypeScript strict) for one
household: staples library, trip sweep at home, store view by section, synced
through Firestore. Web deploys to https://grocery-list-cad.web.app from CI on
`main`. Functional, ports-and-adapters code — no classes.

`npm run verify` is the single local gate (typecheck, lint, prettier check,
domain sibling-test check, feature-map check, dead-code check, script tests,
jest). CI runs the same command. Git hooks (simple-git-hooks, installed by `npm install`) run
lint + format on commit and typecheck + map check + dead-code check on push.
Lint enforces no classes (ADR-009) and the layer boundaries; `knip`
(`npm run check:dead`) fails on unused files, exports, and dependencies.

This file is a map. Open the page that owns the task:

- Setup, commands, testing, mutation testing: [CLAUDE.md](CLAUDE.md), [README.md](README.md)
- Architecture and primitives (compose these first): [docs/primitives.md](docs/primitives.md)
- Decisions, including what **not** to do: [docs/adrs/README.md](docs/adrs/README.md)
- Run and prove a change in the real app: [control-grocery-list skill](.claude/skills/control-grocery-list/SKILL.md), [docs/feature-map.md](docs/feature-map.md)
- Shipping a PR: [ship-pr skill](.claude/skills/ship-pr/SKILL.md)
- Filing friction: [friction-log skill](.claude/skills/friction-log/SKILL.md). Every PR ends with a friction issue or the `friction-skipped` label, in every environment
- Deploy, health check, rollback: [docs/deploy.md](docs/deploy.md)
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

No AI reviewer and no preview environment are configured. When unsure, pick
the higher tier.

## Issues and triage

Every issue agents file gets one priority label — `P0` (broken now), `P1`
(this week), `P2` (when nothing higher), `P3` (nice to have) — plus
`needs-decision` when it needs a product or one-way-door call. Work the
highest priority first; skip `needs-decision` issues until the maintainer
answers and removes the label.
