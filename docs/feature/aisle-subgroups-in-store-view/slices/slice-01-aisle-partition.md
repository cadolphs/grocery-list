# Slice 01: Aisle Partition + Dividers + Badges

**Feature ID**: aisle-subgroups-in-store-view
**Effort**: ≤4h crafter dispatch
**Story**: US-01

---

## Goal

Inside a multi-aisle section card, items are partitioned by `aisleNumber`, separated by a divider with a numeric aisle badge.

## In Scope

- Pure domain helper that partitions a `SectionGroup`'s items into aisle sub-groups (numeric ascending; null tail when mixed).
- `AisleSection` component renders sub-groups with divider + badge between them.
- Multi-aisle sections show divider + numeric badge per aisle group.
- Mixed sections show numeric groups first, then `No aisle` tail.
- Single-aisle sections collapse: no badge, no divider.
- All-null sections collapse: no badge, no divider.

## Out of Scope

- Per-aisle progress / completion checkmarks (slice 02).
- Settings, persistence, ordering changes.
- Edit-staple changes.

## Learning Hypothesis

- **Disproves if it fails**: that a divider + numeric aisle badge is sufficient to restore Carlos's mid-shop orientation. If Carlos still loses track of which aisle he is in after this ships, the visual treatment is wrong (not the partition logic) — re-design the badge.
- **Confirms if it succeeds**: that aisle-level visual structure (not aisle-level *feedback*) is the load-bearing change for orientation, and slice 02 is incremental polish.

## Acceptance Criteria

- [ ] `Inner Aisles` with items at aisles 4, 5, 7 renders three sub-groups, dividers + badges `4`, `5`, `7`, ascending.
- [ ] `Produce` with all `aisleNumber: null` renders a flat list — no divider, no badge.
- [ ] `Frozen` with only items at aisle 12 renders a flat list — no badge.
- [ ] `Inner Aisles` with aisle 4, 5, and one null item renders aisle 4, aisle 5, then `No aisle` tail.
- [ ] Item input order preserved within each aisle sub-group.

## Dependencies

- Existing `groupBySection` in `src/domain/item-grouping.ts`.
- Existing `AisleSection` in `src/ui/AisleSection.tsx`.

## Reference Class

Similar in shape to: prior section-grouping work (`groupBySection` + `AisleSection`) and area-grouping (`groupByArea` + `AreaSection` from grocery-list-ui-m1). Implementation footprint: ~50 LOC domain + ~30 LOC UI + tests.

## Pre-Slice SPIKE

Not required. Pattern is well-established.

## Dogfood Moment

Same-day install on Carlos's iOS device. Validated on next shop (or simulated trip with real staple library).
