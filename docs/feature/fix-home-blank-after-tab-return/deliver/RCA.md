# RCA: Home View Blank After Home → Store → Home (Web)

**Status**: User-approved, full-tier fix.

## Symptom

Web app. User has staples → Home renders correctly. Tap Store → Store renders. Tap Home → only chrome renders (tabs, Sign out, Settings, Sweep/Checklist toggle, QuickAdd, "0 of 0 areas complete", Reset Sweep). No area sections. Hard reload (CMD+R) restores. iOS/Android: behaviour unknown, focus on web.

Intermittent `net::ERR_BLOCKED_BY_CLIENT` on Firestore Write + Listen channels (browser extension blocking) observed but **not the trigger** — bug repros independently.

## Root Causes (stacked)

### A. `useAreas` non-reactive

`src/hooks/useAreas.ts:17` — `useState<string[]>(() => areaManagement.getAreas())` lazy-inits once per mount. No `useEffect` re-sync, no subscription. Contrast `src/hooks/useTrip.ts:32-39` which subscribes to `tripService`.

`src/hooks/useAppInitialization.ts:167` creates area storage **without** passing `onChange` (contrast `stapleStorage` line 166, `tripStorage` line 169 which do). `src/adapters/firestore/firestore-area-storage.ts:57-60` fires `onChange?.()` on remote change but nothing listens.

### B. `tripService.tripAreas` frozen at build time

`src/domain/trip.ts:96-97,201` — `const tripAreas = areas ?? DEFAULT_HOUSE_AREAS` captured once at `createTrip()` call. `totalAreas: tripAreas.length` never updates. Explains "0 of 0 areas complete" when areas exist.

No `handleAreaChange` counterpart to `handleStapleChange` in `useAppInitialization.ts`.

### C. Destructive tab switching

`src/ui/AppShell.tsx:35` — `{viewMode === 'home' ? <HomeView /> : <StoreView />}`. Conditional mount, not visibility toggle. HomeView fully destroyed on switch, remounts from possibly-stale service cache. No ErrorBoundary surfaces silent empties.

## Approved Fix Tier: FULL

| # | Fix | Files | Risk |
|---|-----|-------|------|
| 1 | Wire `onChange` through `areaStorage` → `useAreas` (mirror `useTrip` pattern) | `src/ports/area-storage.ts`, `src/adapters/firestore/firestore-area-storage.ts`, `src/adapters/async-storage/async-area-storage.ts`, `src/domain/area-management.ts`, `src/hooks/useAreas.ts`, `src/hooks/useAppInitialization.ts` | Medium |
| 2 | `createTrip(storage, areasGetter)` — pass getter so `getSweepProgress` reads live value | `src/domain/trip.ts`, `src/hooks/useAppInitialization.ts` | Low |
| 3 | AppShell visibility toggle instead of conditional mount | `src/ui/AppShell.tsx` | Low |
| 4 | ErrorBoundary around AppShell | `App.tsx` (add component) | Very low |
| 5 | Firestore area adapter: seed defaults on empty/missing doc (symmetric to `async-area-storage.ts:48-52`); defensive fallback for blocked-client | `src/adapters/firestore/firestore-area-storage.ts` | Low |

## Regression Tests Required (RED before GREEN)

1. **UI integration**: render `<AppShell />` with staples + areas in storage. Toggle view to Store, toggle back to Home. Assert area section headers still visible (e.g. `getByText('Fridge')` or section test-id). Location: `tests/regression/ui/`.
2. **Domain (trip getter)**: `createTrip(storage, () => [])` → `getSweepProgress().totalAreas === 0`. Then areas update, `createTrip(storage, () => ['A','B'])` → `totalAreas === 2` without recreating service. Location: `src/domain/trip.test.ts` or `tests/unit/domain/`.
3. **Hook reactivity**: mount `useAreas`, mutate via `areaManagement` or fire `areaStorage.onChange`, assert hook returns new list without unmount. Location: `src/hooks/useAreas.test.ts` (or existing test file).
4. **Firestore adapter seeding**: simulate empty doc → `loadAll()` returns `DEFAULT_HOUSE_AREAS`. Location: `src/adapters/firestore/firestore-area-storage.test.ts`.

## Constraints

- Functional paradigm. No classes. Use factories/closures.
- Ports-and-adapters: domain must not import adapters.
- Keep fixes minimal — no extra refactoring beyond stated scope.
- All existing tests must remain green.

## Minimal Fix Sequence (suggested roadmap shape)

1. **Step A**: Domain test + fix — `createTrip` getter signature (Fix 2). Pure domain, no I/O.
2. **Step B**: Port + adapters — add `subscribe` to `AreaStorage` port; implement in Firestore + AsyncStorage adapters (Fix 1 foundation + Fix 5 seeding).
3. **Step C**: Hook wiring — `useAreas` subscribe via `useEffect`; `useAppInitialization` passes `onChange` and builds `handleAreaChange` (Fix 1 completion).
4. **Step D**: UI regression test + AppShell visibility toggle (Fix 3).
5. **Step E**: ErrorBoundary (Fix 4).

Steps may be combined if cohesive; crafter decides final shape.
