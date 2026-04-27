# Prioritization

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27

## Slice Order

| Order | Slice | Why this order |
|-------|-------|----------------|
| 1 | Slice 01 — Aisle partition + dividers + badges | Highest learning leverage. The whole feature rests on the bet that aisle structure (not just sort) is the missing signal. If slice 01 fails, slice 02 is wasted. |
| 2 | Slice 02 — Per-aisle progress + checkmark | Cheap polish on top of slice 01's structure. Only valuable if slice 01 works. |

## Dependency Chain

`Slice 01` → `Slice 02`. Slice 02 reuses the partition helper introduced in slice 01.

## Dogfood Cadence

Both slices ship same-day to Carlos's iOS device. Slice 01 validated on first shop; slice 02 validated on subsequent shop.

## Outcome-Impact Ranking

| Outcome KPI | Slice that moves it most |
|-------------|--------------------------|
| Aisle orientation accuracy (Carlos can name his current aisle without re-checking item metadata) | Slice 01 |
| Aisle closure cue (Carlos commits to leaving an aisle without ambiguity) | Slice 02 |

Slice 01 unlocks the load-bearing outcome; slice 02 refines it.
