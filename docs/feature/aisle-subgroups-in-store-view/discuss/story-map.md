# Story Map: Aisle Subgroups in Store View

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27

---

## Backbone (User Activities)

`Walk the store` → `Identify current aisle` → `Track aisle progress` → `Cross to next aisle`

This refinement targets the middle two activities, which are currently invisible in the UI.

---

## Walking Skeleton

N/A — brownfield refinement on top of an existing store view. The walking skeleton already exists from prior features (`grocery-list-ui-m1`, `store-section-order`, `section-order-by-section`).

---

## Slices (Elephant Carpaccio)

| # | Slice | Goal | Effort | Learning Hypothesis |
|---|-------|------|--------|---------------------|
| 01 | Aisle partition + dividers + badges | Visible aisle boundary inside multi-aisle section card | ≤4h | Disproves "aisle ascending sort is sufficient signal"; confirms divider+badge restores orientation. |
| 02 | Per-aisle progress + completion checkmark | Closure cue when an aisle is done | ≤3h | Disproves "section-level progress is enough"; confirms aisle-level closure aids the cross-aisle decision. |

Both slices ship end-to-end (domain partition fn → UI render) on production data (real trip items in dev/preview build). Each is dogfooded same-day by Carlos on his next shop.

### Taste Tests

- [x] No slice ships 4+ new components. Slice 01 adds one tiny `AisleSubGroup` block inside `AisleSection`. Slice 02 just enriches that block with progress text.
- [x] No new abstraction shipped first then used. The partition function is added inside slice 01 alongside its single consumer.
- [x] Each slice has a learning hypothesis (see table).
- [x] No synthetic data — slices are validated against the real staple library on Carlos's device.
- [x] Slices are not duplicates at different scale — slice 01 is structure, slice 02 is feedback. Independent value.
- [x] Explicit IN/OUT scope per slice (see slice briefs).

---

## Slice Order Rationale

1. **Slice 01 first** — orientation is the higher-anxiety failure mode (Carlos getting lost mid-shop). Highest learning leverage: if the divider+badge does not restore orientation, slice 02's progress is wasted polish.
2. **Slice 02 second** — depends on the partition produced in slice 01. Cheap follow-on; only valuable if slice 01 ships.

---

## Out of Scope (Story Map)

- Aisle reordering inside a section (sort stays ascending — Q6a).
- Persisted "current aisle" cursor.
- Section-to-aisle navigation gestures (Q3 of prior feature, deferred again).
- Settings UI changes.
- Edit-staple flow changes.
