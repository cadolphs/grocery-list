# Evolution: fix-home-blank-after-tab-return

Date: 2026-04-24
Type: Bug fix (RCA → staged fixes → ship)
Branch merged to: main

## Feature Summary

Fix a web-only regression where the Home view rendered only chrome (tabs, Sign out, Settings, Sweep/Checklist toggle, QuickAdd, "0 of 0 areas complete", Reset Sweep) after the user navigated Home → Store → Home. A hard reload restored the view. Three stacked root causes in the area/trip/tab-switch layer were addressed with five small, focused fixes across the domain layer, the `AreaStorage` port and its two adapters, the `useAreas` hook, and the `AppShell` composition. A top-level `ErrorBoundary` was added so future silent-empty regressions surface instead of rendering blank chrome.

## Business Context

Before this fix, a user who relied on tab-switching (the main web navigation idiom in this app) would see their area sections disappear after one round-trip through the Store tab. The data was still in Firestore and the staples list still rendered correctly — only the area rendering collapsed, accompanied by a misleading "0 of 0 areas complete" progress label. Because a hard reload restored the view, the bug was easy to work around but corrosive to trust: users could not tell whether their data had been lost or whether the app was broken. The RCA pinpointed three stacked causes (non-reactive `useAreas`, a `tripAreas` list frozen at service-construction time, and destructive conditional-mount tab switching), all of which had been latent since areas were introduced and only became visible in combination on the web target.

## Root Cause Analysis

Full RCA (user-approved) identified three stacked root causes. Captured here because the temporary workspace copy is being discarded at finalize:

**A. `useAreas` was non-reactive.** `src/hooks/useAreas.ts` used `useState(() => areaManagement.getAreas())` to lazy-init once per mount, with no `useEffect` re-sync and no subscription to area-storage changes. The Firestore area adapter already fired an `onChange?.()` callback on remote change, but nothing in the hook or in `useAppInitialization` was listening — the `areaStorage` factory was instantiated without an `onChange` argument (contrast the sibling `stapleStorage` and `tripStorage` factories, which were wired correctly).

**B. `tripService.tripAreas` was frozen at service-construction time.** `src/domain/trip.ts` captured `const tripAreas = areas ?? DEFAULT_HOUSE_AREAS` once inside `createTrip()`. Every subsequent `getSweepProgress()` call returned `totalAreas: tripAreas.length` against that stale snapshot. When the user added or changed areas post-boot, the trip service never noticed — explaining the "0 of 0 areas complete" label even when areas existed in storage.

**C. Destructive tab switching.** `src/ui/AppShell.tsx` rendered `{viewMode === 'home' ? <HomeView /> : <StoreView />}` — a conditional mount, not a visibility toggle. Switching tabs tore down `HomeView` completely and remounted it on return, at which point the still-frozen `tripService` and the still-non-reactive `useAreas` combined to render the empty shell. The lack of any top-level `ErrorBoundary` meant silent-empty states surfaced as blank UI rather than as a visible error.

The intermittent `net::ERR_BLOCKED_BY_CLIENT` on Firestore Write/Listen channels (a browser-extension interaction) was observed during investigation but ruled out as a trigger — the bug reproduced with and without the blocked channel.

## Fixes Applied

Five small, focused commits on `main`, each corresponding to one root-cause layer:

| Commit    | Scope                                                                               | Root cause |
|-----------|-------------------------------------------------------------------------------------|------------|
| `28880b9` | `fix(trip): accept areasGetter for live totalAreas` — `createTrip` now takes a getter instead of a frozen array; `getSweepProgress` reads live. | B          |
| `e712c08` | `fix(area-storage): add subscribe to port + adapters` — `AreaStorage` port gains a `subscribe`/`onChange` contract; Firestore and AsyncStorage adapters implement it. | A (foundation) |
| `2059c79` | `fix(hooks): make useAreas reactive to area storage changes` — `useAreas` subscribes via `useEffect`; `useAppInitialization` wires the `onChange` callback through and builds a `handleAreaChange` counterpart to `handleStapleChange`. | A (completion) |
| `0384acb` | `fix(firestore): seed default areas on empty doc` — Firestore area adapter now seeds `DEFAULT_HOUSE_AREAS` on empty/missing doc, symmetric to `async-area-storage.ts`. Defensive behaviour for blocked-client and first-boot cases. | Adapter-symmetry gap surfaced by RCA |
| `9a2c261` | `fix(ui): visibility-toggle tabs + ErrorBoundary` — `AppShell` renders both views and toggles visibility via `display: none` (no destructive unmount); a top-level `ErrorBoundary` wraps the shell in `App.tsx`. | C          |

Fix order matched the RCA's minimal fix sequence (Step A → Step B → Step C → Step D → Step E) so each commit landed on a green test suite. Each fix was accompanied by a RED regression test before GREEN, per the RCA's "Regression Tests Required" list.

## Test Suite State

- Full suite: **627 passed**.
- TypeScript strict-mode: clean.
- DES integrity verification: **PASSED** — `5/5 steps have complete DES traces`.
- Regression tests added: UI-integration (Home → Store → Home round-trip asserts area section headers still visible), domain (`createTrip(storage, () => [])` vs `createTrip(storage, () => ['A','B'])` with live getter), hook reactivity (`useAreas` re-renders on `areaStorage.onChange`), Firestore adapter seeding (empty doc → `DEFAULT_HOUSE_AREAS`).

## Skipped Ceremony

This was a bug-fix delivery, not a feature cycle. The user explicitly chose "ship now" after all five fixes were green, and the following steps were deliberately skipped:

- **L1–L4 refactor pass** — skipped. Each of the five commits is already small, single-layer, and touches the minimum files required. An RPP pass would mostly re-touch already-surgical diffs.
- **Adversarial review** — skipped. Scope was fully specified by the user-approved RCA; the fix shape was pre-agreed (the "FULL tier" table in the RCA). There was no open design question for a reviewer to probe.
- **Mutation testing (Stryker)** — skipped. Two of the five commits (`28880b9` trip getter, `e712c08` area-storage port) are in the Stryker mutation scope (`src/domain/**` + `src/ports/**`) and would normally trigger the `mutation.yml` workflow on push. The user opted out for this delivery given the tight, test-first fix sequence and the small surface area. Rationale: bug-fix scope, small focused commits, user opt-out.

All three skips are recorded here (rather than in a separate doc) so the trade-off is visible to future readers without requiring them to reconstruct the delivery conversation.

## Lessons Learned

1. **Stacked root causes hide behind "one bug."** The blank-Home symptom looked like a single tab-switching bug. Three independent defects (frozen domain snapshot, non-reactive hook, destructive unmount) all contributed, and any single fix in isolation would have left the regression latent. The RCA's discipline of separating symptom from cause — and explicitly listing three causes before proposing five fixes — was what made this a two-hour fix instead of a two-day rabbit hole.

2. **Port–adapter symmetry is a free regression signal.** The `AreaStorage` port was missing the `onChange` callback that `StapleStorage` and `TripStorage` both had. That asymmetry was visible in the codebase long before the bug surfaced — any port-level audit ("do all three storage ports expose the same change-notification contract?") would have flagged it. Worth adding a periodic port-symmetry check when adding a new storage port.

3. **Visibility-toggle vs conditional-mount is a UI-shell invariant.** Tab shells that unmount the hidden tab are fine for pages that can be reconstructed from URL state, but they're a footgun for pages driven by in-memory service subscriptions. The `display: none` toggle costs nothing (both trees stay mounted, React reconciles cheaply) and removes an entire class of "state lost on tab switch" bugs. Worth documenting as the default pattern for this app's shell.

4. **Top-level `ErrorBoundary` should have been there from day one.** The bug rendered as a blank shell rather than an error because nothing caught the silent-empty state. An `ErrorBoundary` around `AppShell` would not have prevented the bug but would have surfaced it as a visible error — turning a "ship broke and no one knows why" symptom into a loud, attributable failure. This is the kind of scaffolding that belongs in the walking skeleton, not added reactively after the first silent-empty regression.

5. **"Ship now" on bug fixes is on-policy when the fix shape is pre-approved.** The user's opt-out from refactor/review/mutation was not a corner-cutting call — it was a proportionality call. The RCA pre-specified the fix tier, each commit was single-layer, regression tests were written RED-first, and the full suite was green at every step. The ceremony overhead for a fix of this shape would have outweighed its risk-reduction value. Documenting the skip (here) preserves the audit trail without blocking the ship.

## Mutation Gate

Skipped by user opt-out (see "Skipped Ceremony" above). Two commits (`28880b9`, `e712c08`) touch in-scope paths (`src/domain/trip.ts` and `src/ports/area-storage.ts`). If a later feature re-touches either file, the normal per-feature Stryker policy applies and will cover these surfaces.

## Related Files

Production:

- `src/domain/trip.ts` — `createTrip` accepts `areasGetter` for live `totalAreas`
- `src/ports/area-storage.ts` — adds `subscribe`/`onChange` to the port contract
- `src/adapters/firestore/firestore-area-storage.ts` — implements `subscribe`; seeds `DEFAULT_HOUSE_AREAS` on empty doc
- `src/adapters/async-storage/async-area-storage.ts` — implements `subscribe`
- `src/domain/area-management.ts` — threads the subscribe/onChange contract
- `src/hooks/useAreas.ts` — subscribes via `useEffect`
- `src/hooks/useAppInitialization.ts` — wires `onChange` through to `areaStorage`; builds `handleAreaChange`
- `src/ui/AppShell.tsx` — visibility-toggle tabs (no destructive unmount)
- `App.tsx` — wraps shell in `ErrorBoundary`

Commits:

- `28880b9` — `fix(trip): accept areasGetter for live totalAreas`
- `e712c08` — `fix(area-storage): add subscribe to port + adapters`
- `2059c79` — `fix(hooks): make useAreas reactive to area storage changes`
- `0384acb` — `fix(firestore): seed default areas on empty doc`
- `9a2c261` — `fix(ui): visibility-toggle tabs + ErrorBoundary`
