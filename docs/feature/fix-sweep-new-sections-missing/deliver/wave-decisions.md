# Wave Decisions — fix-sweep-new-sections-missing

## Step 01-02 — Deviation: touch `src/domain/staple-library.ts`

### Context

Roadmap step 01-02 excludes `src/domain/**` from modifications unless flagged here. The step prescribes two functional options:

1. Inject a live staples array from an existing reactive hook (`useStaples()` or similar).
2. Add a minimal functional `subscribe(listener) -> unsubscribe` capability on the staple-library factory and have the screen subscribe (e.g. via `useSyncExternalStore`).

### Reconnoitre (evidence)

Searched the codebase for a pre-existing reactive staples hook:

- `Grep` for `useStaples|useReactiveStaples` — no files matched in `src/hooks/`.
- `src/hooks/useTrip.ts` has `useTrip().items` driven by `tripService.subscribe(...)` + `useState`, but it tracks trip items (not staples).
- `src/ui/HomeView.tsx:33` and `src/ui/StoreView.tsx:33` both read staples via `stapleLibrary.listAll()` inside `useMemo([stapleLibrary])` — same stale-memo bug as `SectionOrderSettingsScreen` (they don't currently re-render on staple mutations either; they happen to appear reactive because they share `useTrip()` re-renders, not because staples are reactive).
- `useAppInitialization` wires `handleStapleChange` but only to drive `tripService` updates; no React state mirrors staples.

Conclusion: **option 1 is infeasible.** There is no pre-existing reactive staples hook to inject.

### Decision

Proceed with **option 2**: add a functional `subscribe(listener) -> unsubscribe` capability to `createStapleLibrary` in `src/domain/staple-library.ts`, mirroring the existing functional pattern already used by `createTrip` in `src/domain/trip.ts:96-103,298-301`.

### Scope of the deviation

- **File touched outside listed `files_to_modify`:** `src/domain/staple-library.ts`
- **Nature of change:** purely additive. New `subscribe` function on the returned record; internal `listeners` Set and `notify()` closure. Call `notify()` from `addStaple`, `addOneOff`, `updateStaple`, `remove` after storage mutation. No change to `StapleStorage` port (`src/ports/staple-storage.ts` untouched). No change to any adapter.
- **Functional discipline preserved:** no classes, immutable public API, closure over listener set (same pattern as `createTrip`).
- **Test impact:** existing `src/domain/staple-library.test.ts` (if any) remains green — only additions, no changed behavior for existing methods.

### Why this is safe

1. `src/ports/**` is untouched — port contracts are unchanged.
2. The addition mirrors an already-blessed pattern (`createTrip.subscribe`), which already crosses the same architectural boundary and is used by `useTrip`.
3. No Firestore / cross-device / persistence concerns — this is a purely in-memory, intra-session subscription used only to drive UI re-renders.
4. No public API breakage — existing consumers of `StapleLibrary` ignore the new `subscribe` field.

Recorded by: nw-functional-software-crafter, 2026-04-16.
