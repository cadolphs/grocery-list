# Journey Delta: Aisle Subgroups in Store View

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27
**Refines**: section-order-by-section (D2)
**Job Trace**: JS4 (Store Navigation) — already validated

---

## Context

Prior feature `section-order-by-section` collapsed the store view to one header per section, with items sorted by aisle ascending inside. This worked for the *macro* walking order but stripped the *aisle* signal from the inner block. Carlos walks `Inner Aisles` from aisle 4 to 7, and right now the screen gives no cue when he crosses from aisle 4 to aisle 5 — just an unbroken list of items.

This refinement reintroduces aisle visibility *inside* the section card without touching the section ordering model.

---

## Mental Model

- **Section** = physical zone of the store (e.g., `Inner Aisles`, `Produce`, `Deli`).
- **Aisle** = sub-position within a zone, numeric, only meaningful in zones that have aisles.
- A section may contain N aisles (`Inner Aisles`: 4, 5, 7) or zero (`Produce`: all `aisleNumber: null`).
- Carlos thinks: "I'm walking *through* `Inner Aisles`, and I want to know which aisle I'm standing in."

---

## Happy Path Delta (vs. current behaviour)

| Step | Today | After this feature |
|------|-------|--------------------|
| 1. Open store view during a trip | Section cards in custom order | unchanged |
| 2. Look inside `Inner Aisles` card | Items 1..N sorted by aisle ascending, no markers | Items partitioned by aisle with a divider + aisle badge between groups |
| 3. Check off items in aisle 4 | Section progress increments | Aisle 4 sub-progress increments; section progress also increments |
| 4. Aisle 4 fully checked | Section keeps tracking | Aisle 4 sub-group shows `✓` and `X of X` |
| 5. Move to aisle 5 | No on-screen confirmation of aisle change | Visible divider with `Aisle 5` badge marks the transition |
| 6. Section like `Produce` (all null aisles) | Items in input order under section header | Unchanged — no sub-headers (Q2a) |
| 7. Section with mixed aisle + null items | Null items mixed in by sort, no marker | Numbered aisle groups first (asc), then `No aisle` sub-group at tail (Q3a) |
| 8. Section with single aisle (e.g. `Frozen` aisle 12 only) | Items under section header | Unchanged — single-aisle sections collapse the redundant sub-header (Q5b) |

---

## Emotional Arc

| Moment | Today | After |
|--------|-------|-------|
| Mid-shop, scanning section card | Mild disorientation: "wait, am I still in aisle 4 or did I move?" | Confidence: aisle badge confirms position |
| Finishing aisle 4 | Ambiguous; no closure cue | Closure: aisle sub-group goes `✓` |
| Crossing aisle boundary | Silent — relies on memory | Affirming: divider + new badge = "moving on" |
| `Produce` section | Already calm (no aisles) | Unchanged |

Trajectory: confidence builds at every aisle boundary instead of degrading.

---

## Shared Artifacts

| Artifact | Source of truth | Consumed by |
|----------|-----------------|-------------|
| `SectionGroup` (existing) | `src/domain/item-grouping.ts::groupBySection` | StoreView card rendering |
| `AisleSubGroup` (new) | new partition function in `item-grouping.ts` | `AisleSection` component |
| `aisleNumber: number \| null` on each `TripItem` | `StoreLocation` type (existing) | partition function |

No persistence change. Pure presentation.

---

## Error / Edge Paths

- **Section with all null aisles** (`Produce`) → render flat list under section header, no sub-headers.
- **Section with mixed numeric + null** → numeric aisles asc, then `No aisle` sub-group at tail.
- **Single-aisle section** → flat list, no sub-header (avoid redundant `Aisle 12` when there is only one).
- **Aisle group complete but section incomplete** → aisle `✓` shows; section header `✓` does not.
- **All aisle groups complete** → both aisle and section `✓` show (consistent with current section completion).

---

## Out of Scope

- User-defined aisle order inside a section (Q6a — keep ascending).
- Persisted "current aisle" cursor / scroll-to-aisle.
- Section-to-aisle navigation gestures.
- Settings UI changes.

---

## Changed Assumptions

**Source**: `docs/feature/section-order-by-section/discuss/wave-decisions.md` D2

> "Single header per section in store view, items sorted by aisle ascending inside (Q1=a)"

**New assumption**: Items are still sorted by aisle ascending and the section retains a single header, but **aisle boundaries inside the section are now visually marked with a divider + aisle badge sub-header**, and each aisle group reports its own progress and completion state.

**Rationale**: D2 satisfied the *ordering* requirement but not the *orientation* requirement. Mid-shop user feedback 2026-04-27: "I only see items per store section ordered by aisle, but it doesn't tell me which aisle I'm in." The original D2 assumed aisle ascending sort was sufficient signal — it isn't.

**DISCOVER documents**: unchanged (DISCUSS-only refinement).
