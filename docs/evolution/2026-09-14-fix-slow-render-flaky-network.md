# Evolution — fix-slow-render-flaky-network

**Feature ID**: fix-slow-render-flaky-network
**Date**: 2026-09-14
**Type**: BUGFIX (`/nw-bugfix` → `/nw-deliver`)
**Finishes**: `fix-offline-staple-cache-wipe` (same day) — §8 follow-ups 1 (harmonise the trip adapter's disarm, D4) and 2 (F3, render from the mirror)
**Status**: SHIPPED
**Paradigm**: Functional TypeScript (per CLAUDE.md)
**Density**: lean

---

## 1. Summary

**Problem**: after `fix-offline-staple-cache-wipe`, a flaky-network cold start showed the *correct* list — but not sooner. An authenticated user with every adapter already hydrated from its AsyncStorage mirror still stared at `LoadingScreen` for ~10 s (connected-but-dead wifi) to unbounded (flapping wifi).

**Root cause A — readiness meant "first remote snapshot"**. Every adapter's `initialize()` hydrated from the mirror and then returned a Promise resolved only inside its first `onSnapshot` callback (the trip adapter needed *both* trip and carryover callbacks). `useAppInitialization` awaits all four with `Promise.all`; `App.tsx` renders `LoadingScreen` until then. On React Native the Firestore local view is memory-only, so for an empty view the SDK withholds the initial event until it declares itself `Offline` — a 10 s timer that re-arms on every watch-stream restart. `initialize()` was written when the network was the only source of truth; the mirror was bolted on as a hydration step in front of the same unchanged Promise, and readiness was never redefined.

**Root cause B — the trip adapter disarmed its empty-snapshot guard on every local write (D4)**. Its five mutators cleared `tripHydratedFromLocal` / `carryoverHydratedFromLocal`, and the carryover handler cleared the flag on *every* snapshot that passed the guard, including `exists=false`. The three adapters mirrored in the prior fix disarm only on a data-bearing snapshot. The asymmetry was masked: the app could not render, so the user could not edit, until the first snapshot had already been processed. Resolving readiness early (A) would have opened exactly the edit-before-first-snapshot window in which the old semantics clobber a local edit with `null`.

**Finding C — no watermark is needed to ship F3**. The prior RCA said F3 "must not ship without a local-write watermark". Re-examined against the SDK: in-process, a `setDoc` is applied to the local view immediately and every later snapshot for that doc reflects the overlay (`hasPendingWrites`), so the SDK cannot deliver `exists=false` for a doc this process wrote unless the backend rejects the mutation or another client deletes it — and the app never calls `deleteDoc`. The only reachable in-process race is a benign transient (an `exists=false` event computed before the write, delivered after it), and under the data-bearing-only rule the guard stays armed through it. A watermark *is* required for a different defect — stale-server-wins after a process restart — which exists today and is neither caused nor widened by F3 (see §6 R7 and §8).

**Solution**: D4 first (strict narrowing of when a flag is cleared; safe alone), then F3 (resolve `initialize()` from the mirror when it yields an entry; the subscription is registered either way).

---

## 2. Scope Decision

User approved **D4 + F3, no watermark**. Deliberately excluded:

- **R7 / local-write watermark** (stale-server-wins across a process restart). Pre-existing, independent of F3, explicitly deferred by the user as a separate follow-up. Recorded here so it is not attributed to F3 in bug reports.
- **Auth-gate additivity** (`App.tsx`, `useAppInitialization.ts`): auth revalidation and the Firestore wait are sequential; F3 shortens the second term only.
- **Prior evolution doc §8.3-8.4** (area adapter's adapter-to-adapter import; ADR renumbering) — unchanged, still open.

---

## 3. Key Decisions

**D1 — D4 before F3, in separate steps.** D4 is safe without F3 (no user-reachable path changes while the render gate sequences every edit after the first snapshot). F3 is unsafe without D4. So the flag narrowing shipped first and alone, and the readiness change followed.

**D2 — One readiness rule for all four adapters.** *If the mirror yielded an entry, resolve immediately; otherwise await the first snapshot.* A brand-new device (first install, new uid) has nothing to render and the server is all it has, so that path is unchanged. The `firstSnapshot` promise is still constructed and `onSnapshot` still registered before returning — only the `await` is skipped. The promise never rejects, so leaving it un-awaited is safe. No port change: `InitializableStorage.initialize` stays `() => Promise<void>`; `useAppInitialization.ts` untouched.

**D3 — Each adapter's "entry present" predicate reuses the value its hydration code already computed.**
- staples: `localStaples !== null` — a mirrored `[]` is a recorded decision and counts.
- areas: `localAreas !== null` — the reader already maps empty/invalid to `null`, so the `DEFAULT_HOUSE_AREAS` fallback stays a genuine-no-data fallback.
- section order: `mirroredOrder !== null` — the envelope is present; `order: null` inside it is a legitimate cleared value and counts.
- trip: **compound**, `localTrip !== null && localCarryover !== null`. The completed-trip rebuild in `trip.ts` consumes carryover; resolving with only the trip mirror could rebuild without server-side carryover and then `clearCarryover()` it. Both keys have been written together since April, so in practice both are present or both absent (RCA R5).

**D4 — One disarm rule for all four adapters, now including the trip.** *Only a snapshot that carries data disarms the guard; local writes never touch it.* A local write is evidence about local intent, not about server state. For carryover, an existing document with `items: []` *is* server data (`clearCarryover` persists `[]`) and disarms; `exists=false` is silence and leaves the guard armed. The known inconsistency recorded in the brief and in the prior evolution doc (D4, §8.1) is closed.

**D5 — Test inversion keeps the withheld regime (R8).** The three assertions that pinned "initialize() stays pending under `withheld`" were written to prove hydration does not depend on the snapshot. They are inverted to `toBe(true)` and become the F3 acceptance tests, but the `withheld` mode and the `loadAll()` / `loadOrder()` assertions are retained, and each gains an `onSnapshot`-registered assertion, so a future refactor that makes hydration depend on the snapshot hangs the test rather than passing.

**D6 — Behaviour change on an ONLINE cold start (R1), accepted.** Before: `LoadingScreen` until the server answers (typically <1 s), then one render from server data. After: render from the mirror as soon as the AsyncStorage reads complete (tens of ms), then a snapshot-driven update. For a single-device user that update is a no-op (`onChange` is suppressed by the serialized compare). For a multi-device user it is a brief visible correction. A grace-period `LoadingScreen` was considered and rejected — it reintroduces the wait.

---

## 4. Implementation

| Step | Commit | Change |
|---|---|---|
| 01-01 (D4) | `aff301c` | `firestore-trip-storage.ts` — disarm moved inside the `incomingTrip !== null` branch of the trip handler and the `incomingItems !== null` branch of the carryover handler; five write-path disarms deleted; flag comment aligned with the F1 adapters. Trip regression file gains the `immediate | withheld | delayed` snapshot harness and an AsyncStorage reset. One D4 unit case added to `firestore-trip-storage.test.ts`. |
| 02-01 (F3, trip) | `529616b` | `firestore-trip-storage.ts` — `hydratedFromMirror = localTrip !== null && localCarryover !== null`; both subscriptions registered; `return hydratedFromMirror ? undefined : firstSnapshots`. |
| 02-02 (F3, three adapters) | `654ce94` | `firestore-staple-storage.ts`, `firestore-area-storage.ts`, `firestore-section-order-storage.ts` — same shape with the D3 predicates. Three pinned assertions inverted and renamed; no-mirror controls and the mirrored-`[]` / mirrored-`null` cases added. `docs/product/architecture/brief.md` updated (§7 below). |
| refactor | `f7bd32e` | L1: `commitTripChange` / `commitCarryoverChange` → `commitLocalTripChange` / `commitLocalCarryoverChange` to match the F1 adapters' `commitLocalChange`; `maybeResolve` → `resolveOnceBothArrived`. L2: `resolve()` is a no-op after the first call, so the `resolved` flags and `if`-guards in the first-snapshot promises were dead ceremony — removed in all four adapters. L3: the two regression files carried byte-identical offline Firestore mock infrastructure; it now lives once in `tests/regression/helpers/offline-firestore-harness.ts`. Assertions unchanged. |

Production diff: 4 adapter files, 169 lines changed; no port, hook, domain or `App.tsx` change.

---

## 5. Test Strategy — closing the gaps the RCA named

1. **The trip regression file could only model offline as a synchronous empty snapshot** (E28) — it could not express "edit, then a late snapshot" or "before any snapshot". It now uses the shared harness with `withheld` / `delayed` modes and clears AsyncStorage between tests.
2. **No test pinned the trip adapter's disarm either way** (E29). Four D4 tests now do: a local trip edit survives a later absent snapshot (`onChange` not called); a local carryover edit survives two consecutive absent snapshots (flapping); an absent carryover snapshot received while the mirror holds `[]` does not disarm the guard for a later edit; and the positive control — a data-bearing snapshot still replaces the mirrored trip, is re-mirrored (a later cold start recovers it), and stands the guard down so a *subsequent* absent snapshot is honoured. The first case was RED against the pre-fix adapter (yielded `null` and one `onChange`).
3. **Three assertions pinned the blocking behaviour** (E27). Inverted per D5; plus per-adapter no-mirror `withheld` controls (first-install behaviour unchanged) and the two predicate-edge cases (mirrored empty staple list; mirrored cleared section order — both resolve).
4. **Trip early-resolve**, four tests: both mirrors present + withheld → `initialize()` resolves, `loadTrip()` / `loadCarryover()` return the mirrored values, `onSnapshot` was called for *both* doc paths; no mirror → stays pending; only the trip mirror → stays pending (R5); a data-bearing snapshot after early resolution updates `loadTrip()` and fires `onChange` (the subscription is live, not merely registered).

Deviation from the RCA sketch, recorded in the roadmap: the carryover twin includes a local `saveCarryover` on adapter B before the absent snapshots, because without a write a non-empty mirrored carryover already survived absent snapshots under the old guard — the RCA's two-absent-snapshots-only sketch would not have been RED.

Adapter cold-start sequencing is single-example integration testing; exempt from the PBT mandate, and `fast-check` was not added.

---

## 6. Quality Gates and Accepted Risks

| Gate | Result |
|---|---|
| Test suite | 795 passed, 23 skipped (pre-existing) — from 781 at feature start; +14 tests |
| `tsc --noEmit` | clean |
| `eslint` | clean |
| Mutation | SKIPPED — no changed files in Stryker scope (`src/domain/**`, `src/ports/**`); `src/adapters/` excluded per CLAUDE.md |
| Adversarial review | APPROVED, 0 blocking |
| DES integrity | exit 0, 3/3 steps with complete RED→GREEN→COMMIT traces |

Accepted risks (RCA §7), not mitigated here:

- **R1** — online cold start renders mirror-first then re-renders (D6). Cosmetic.
- **R2** — edit-on-stale-render, multi-device: an edit on the mirrored trip before the server snapshot is a whole-document `setDoc`; last-write-wins discards the other device's concurrent change. Pre-existing property of whole-document LWW; F3 widens the window from "after first snapshot" to "from render". Real fix is field-level merges or the watermark.
- **R4** — `migrationNeeded` now observes mirror state on an online cold start. Only reachable with a mirrored `[]` staple list, a non-empty server list *and* surviving legacy AsyncStorage staples (three coincidences); the offline path is identical to before.
- **R6** — D4 residual: a genuine remote deletion of the trip or carryover doc while the guard is armed is ignored for the session. The app never calls `deleteDoc`, so theoretical; same residual already accepted for the three F1 adapters (prior D6).
- **R7** — stale-server-wins after a process restart. **Not introduced or widened by this fix.** See §8.1.

---

## 7. SSOT Back-Propagation

`docs/product/architecture/brief.md`, Real-Time Sync Pattern:

1. Step 7 now reads "hydrate … BEFORE subscribing, and resolve readiness from the mirror when it yields an entry (await the first snapshot only when it does not)".
2. The paragraph recording the trip adapter's write-disarm inconsistency is removed (closed by 01-01) and replaced with a note that mirror-first readiness landed 2026-09-14 and that the `onSnapshot` subscription is still registered with later snapshots flowing through the existing `onChange` / `subscribe` fan-out.

---

## 8. Follow-ups (not in this fix)

1. **Local-write watermark (R7)** — stale-server-wins across a process restart. On RN the SDK mutation queue is memory-only, so an offline write from session 1 is lost from the SDK while the mirror still holds it; if the server later answers with an *older* doc, it is data-bearing, the server wins, and the offline edit is lost. Pre-existing; explicitly deferred by the user as a separate follow-up. Sketch: mirror `{ value, writtenAt }`, persist `updatedAt: serverTimestamp()` alongside the value, adopt a data-bearing snapshot only if `server.updatedAt >= mirror.writtenAt`, otherwise re-push the mirror. Applies by symmetry to all four adapters.
2. **Auth-gate additivity** (`App.tsx`, `useAppInitialization.ts`) — auth revalidation and the Firestore wait are sequential; worst case is their sum. Out of scope here.
3. **Review non-blocking suggestions**: a docstring on `commitLocalTripChange` / `commitLocalCarryoverChange` stating that local writes never disarm the guard; `brief.md` could state explicitly that mirror-first readiness *supersedes* snapshot-gated readiness rather than only noting when it landed.
4. **Prior evolution doc §8.3-8.4** remain open: `firestore-area-storage.ts` imports `DEFAULT_HOUSE_AREAS` from `../async-storage/async-area-storage` (adapter-to-adapter import); ADR numbering collision in `docs/adrs/`.
