# Slice 02: Per-Aisle Progress + Completion Checkmark

**Feature ID**: aisle-subgroups-in-store-view
**Effort**: ≤3h crafter dispatch
**Story**: US-02
**Depends on**: Slice 01

---

## Goal

Each aisle sub-group displays its own `checked of total` count and a `✓` when fully checked. Section-level totals continue to behave as today.

## In Scope

- Aisle sub-group structure carries `checkedCount` and `totalCount` (extend the partition helper from slice 01).
- `AisleSection` renders `X of Y` for each sub-group, plus `✓` when complete.
- `No aisle` tail group reports its own progress consistently.
- Section-level header progress + checkmark unchanged.

## Out of Scope

- Animated transition on checkmark.
- Sound / haptic on aisle completion.
- Section-level reflow when aisle completes.

## Learning Hypothesis

- **Disproves if it fails**: that aisle-level closure is meaningful to Carlos. If slice 01 already feels complete and aisle progress feels redundant, slice 02 should be reverted, not extended.
- **Confirms if it succeeds**: per-aisle feedback adds usable closure — the cue Carlos uses to commit to walking to the next aisle.

## Acceptance Criteria

- [ ] Aisle sub-group with 2 of 3 checked displays `2 of 3`, no checkmark.
- [ ] Aisle sub-group fully checked displays `3 of 3 ✓`.
- [ ] Section header progress + checkmark behaviour unchanged when partial aisles complete.
- [ ] Section header `✓` shown when all aisles in section complete (existing behaviour).
- [ ] All-null section has no sub-group progress (only section progress).
- [ ] Single-aisle section has no sub-group progress (only section progress).
- [ ] `No aisle` tail in mixed section reports its own `X of Y` and `✓`.

## Dependencies

- Slice 01 partition function and `AisleSubGroup` shape.

## Reference Class

Trivial extension of slice 01. Mirrors `SectionGroup.{checkedCount, totalCount}` already used by `AisleSection` header.

## Pre-Slice SPIKE

Not required.

## Dogfood Moment

Same-day. Validated on next real shop.
