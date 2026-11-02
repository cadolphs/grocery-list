# grocery-list agent index

Grocery list app (Expo SDK 54, React Native + web, TypeScript strict) for one
household: staples library, trip sweep at home, store view by section, synced
through Firestore. Web deploys to https://grocery-list-cad.web.app from CI on
`main`. Functional, ports-and-adapters code — no classes.

`npm run verify` is the single local gate (typecheck, lint, prettier check,
domain sibling-test check, feature-map check, jest). CI runs the same command.
Git hooks (simple-git-hooks, installed by `npm install`) run lint + format on
commit and typecheck + map check on push.

This file is a map. Open the page that owns the task:

- Setup, commands, testing, mutation testing: [CLAUDE.md](CLAUDE.md), [README.md](README.md)
- Architecture and primitives (compose these first): [docs/primitives.md](docs/primitives.md)
- Decisions, including what **not** to do: [docs/adrs/README.md](docs/adrs/README.md)
- Run and prove a change in the real app: [control-grocery-list skill](.claude/skills/control-grocery-list/SKILL.md), [docs/feature-map.md](docs/feature-map.md)
- Shipping a PR: [ship-pr skill](.claude/skills/ship-pr/SKILL.md)
- Filing friction: [friction-log skill](.claude/skills/friction-log/SKILL.md)
- Deploy, health check, rollback: [docs/deploy.md](docs/deploy.md)
- Feature workflow (nWave waves, feature docs): `docs/feature/`, `docs/evolution/`

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
