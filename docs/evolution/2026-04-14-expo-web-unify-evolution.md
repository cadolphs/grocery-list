# expo-web-unify — Evolution Artifact

**Date**: 2026-04-14
**Status**: DELIVERED (local commits; not yet pushed)
**Supersedes**: production code shipped by `web-auth`

## Summary

Retired the `/web` Vite SPA. Web hosting now serves the output of
`npx expo export -p web`, so `https://grocery-list-cad.web.app` renders the
same React Native UI that ships to iOS and Android. Two mechanical commits on
`main`:

- `e1f93d5` — US-01: point `firebase.json` public dir to `dist`, update
  `.github/workflows/deploy-web.yml` to run `npx expo export -p web` at repo
  root, lockstep-update `web-prod-deploy` walking-skeleton assertions.
- `0e89423` — US-02: delete `/web/` directory; un-gate the US-02 acceptance
  tests that asserted its absence.

## Business Context

The mobile Expo app already owned every piece of UX polish (staples, sweep,
pencil-edit, offline trip cache, etc.). The `/web` Vite SPA was a vestigial
parallel codebase — a stripped-down sign-in form plus a bare list view — that
had drifted well behind the RN app. Every feature shipped to mobile cost a
second implementation pass (or, more honestly, a skipped one) on web.

Unifying on Expo Web eliminates that parallel-maintenance tax, gives web users
the full product immediately, and collapses the hosting story to a single
artifact pipeline.

## Wave Decisions

### DISCUSS (D1–D11, summarized)

- **D1–D3** — Scope: retire `/web` entirely; do not attempt partial parity.
  User journeys on web must match mobile, not a curated subset.
- **D4–D5** — Hosting target: keep Firebase Hosting; swap build input only.
  Retain release history so rollback remains one command.
- **D6–D7** — Auth continuity: Firebase Auth session persists across the swap
  because both old and new builds hit the same Firebase project — no user
  re-auth required (K2 drill).
- **D8** — Sequencing: config swap first, deletion second. Two commits so the
  point-of-no-return (directory delete) is isolated and cheap to revert.
- **D9–D10** — CI signal: `web-prod-deploy` walking-skeleton tests are the
  canary. They were lockstep-updated in US-01 and must stay green.
- **D11** — Risk posture: mechanical migration, acceptance tests are the
  quality gate. No adversarial review and no mutation testing (scope-empty).

### DISTILL (DWD-01..DWD-09, summarized)

- **DWD-01..03** — Acceptance suite shape: 10 scenarios split 5 (config) / 5
  (deletion). US-02 block gated until US-01 landed, un-gated in commit 2.
- **DWD-04..05** — Walking-skeleton lockstep: same test file asserts both the
  old Vite shape (pre-US-01) and the new Expo shape (post-US-01). One edit,
  one commit, no orphan assertions.
- **DWD-06..07** — Firebase hosting contract: `public: "dist"`, SPA rewrite to
  `/index.ts` output preserved. No Firestore/Auth rule changes — deliberately
  out of scope.
- **DWD-08** — Deletion verification: test asserts `/web` directory absence,
  not just file absence, to catch a partially-emptied folder.
- **DWD-09** — CI duration budget: `npx expo export -p web` is expected to be
  slower than the prior Vite build (~3–5 min end-to-end). Baseline to be
  captured in `docs/deploy.md` post-push.

### DESIGN + DEVOPS

Both waves **intentionally skipped**. This feature changes one config file,
one workflow file, one test file, and deletes a directory. There is no new
architecture, no new runtime surface, no new infrastructure, and no new
operational posture — the DESIGN and DEVOPS artifacts would have been empty
templates. The acceptance suite plus the lockstep walking-skeleton assertions
fully cover the risk surface.

## Steps Completed

| Commit | Story | Outcome |
|--------|-------|---------|
| `e1f93d5` | US-01 | `firebase.json` public="dist"; `deploy-web.yml` runs `npx expo export -p web` at repo root; `web-prod-deploy` walking-skeleton test assertions updated in lockstep. Acceptance 5/5 GREEN. |
| `0e89423` | US-02 | `/web/` directory deleted; US-02 acceptance block un-gated. Acceptance 10/10 GREEN, full main jest 577 passing. |

## Cross-Feature Links

This feature **supersedes** the production code shipped by `web-auth`. All
`/web` source deleted in `0e89423`. The historical decision records under
`docs/feature/web-auth/` (DISCUSS, DESIGN, DISTILL) remain as reference but
should be considered **code-superseded** — see "Deferred Follow-Ups" below for
the optional cleanup pass that marks them so explicitly.

The authentication patterns (validation, error mapping) that lived in `/web`
are gone with the directory; the mobile RN app has its own paths. A salvage
follow-up is listed below.

## Quality Gates

| Gate | Result |
|------|--------|
| expo-web-unify acceptance | 10/10 GREEN |
| web-prod-deploy walking-skeleton (lockstep) | 10/10 GREEN |
| Full main-repo jest | 577 passing (was 575; +2 from un-gated US-02) |
| DES integrity | PASS — "All 2 steps have complete DES traces" |
| `/web` directory | confirmed absent |

## Mutation Testing — Skipped (justified)

Project strategy is per-feature, scoped to `src/domain/**` and `src/ports/**`.
Verification:

```
git diff --name-only e1f93d5~1..0e89423 -- 'src/domain/**' 'src/ports/**'
# (empty)
```

Zero in-scope files changed, so mutation testing has nothing to run against.
Skipping is the correct outcome, not an exception.

## Adversarial Review — Skipped (justified)

This is a three-file config edit plus a directory deletion. The reviewer's
usual targets — testing theater, hidden coupling, premature abstraction,
uncovered edge cases in new production code — do not apply: there is no new
production code. The acceptance suite (10/10) and the lockstep walking-
skeleton (10/10) are the quality gate, and they assert the externally visible
contract (hosting output shape + directory absence) directly. User autonomy
preference exercised; skip noted here for transparency.

## Post-Push Operations (CHECK THE LIVE SITE)

1. Push `main` (user decision).
2. Watch CI + `deploy-web` workflow runs. `npx expo export -p web` will run
   longer than the prior Vite build — budget ~3–5 min end-to-end.
3. Open https://grocery-list-cad.web.app. **Expected**: the full RN UI
   (staples, sweep, trip list, pencil-edit, etc.), **not** the stripped-down
   Vite sign-in form.
4. Sign in with existing credentials (K2 drill). The Firebase Auth session
   should persist across the swap — same project, same auth state.
5. Capture K1 (pipeline duration) and K2 (sign-in latency) in
   `docs/deploy.md` if appreciably different from the prior Vite baseline.
6. **Rollback path**: if the live UI looks broken, run
   `firebase hosting:rollback` — the prior Vite release is still retained in
   Firebase Hosting's release history.

## Deferred Follow-Ups

- **Mark web-auth DISTILL docs as superseded** — optional cleanup pass.
  Add a top-of-file banner in `docs/feature/web-auth/distill/*.md` pointing
  at this evolution artifact as the successor.
- **Optional US-03 salvage** — hoist the deleted `/web` validation and
  error-mapping patterns into a shared mobile `src/auth/` module, if appetite
  exists. Separate feature; not required for this delivery to be complete.
- **Node.js 20 action-deprecation warnings** — flagged by `web-prod-deploy`
  on deploy. Upgrade `actions/checkout@v4`, `actions/setup-node@v4`, and
  `FirebaseExtended/action-hosting-deploy@v0` when refreshed versions land.
  Non-blocking for this feature.
