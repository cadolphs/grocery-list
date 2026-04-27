# Slice 01: Migrate + Group by Section in Store View

## Goal
Trip rendering produces one card per section; internal items sorted by aisle ascending; legacy composite-key storage wiped on first load.

## IN Scope
- US-04: Wipe legacy `section::aisle` entries from `section_order` storage on first read.
- US-02: `groupByAisle` (or successor) returns one group per section name; intra-section items sorted by aisle ascending, nulls last; `sortByCustomOrder` keys on section name.
- `StoreView.tsx` keying updated to section name.

## OUT Scope
- Settings screen UI (still renders composite rows; superseded by Slice 02).
- Auto-append narrowing (Slice 02).

## Learning Hypothesis
- **Disproves if it fails**: section-keyed grouping breaks intra-section aisle sort or breaks default-sort fallback.
- **Confirms if succeeds**: section-grain grouping is a safe domain refactor with no perf regression.

## Acceptance Criteria
- [ ] `groupByAisle` returns 1 group for trip with items at `Inner Aisles@4`, `Inner Aisles@5`.
- [ ] Items inside a section group sort by aisle asc, nulls last.
- [ ] `sortByCustomOrder` ordered by section name.
- [ ] On launch with legacy stored order (`["Inner Aisles::4", "Deli::null"]`), storage clears, hook returns `null`.
- [ ] Default-sort fallback (no custom order) renders sections alphabetically.

## Dependencies
- None — domain + storage adapters are already in place.

## Effort
≤4 hours.

## Reference Class
`store-section-order` domain delta = ~3 hours; this is similar surface area + migration check.

## Pre-Slice SPIKE
Not needed — domain shape is well understood; only ambiguity (Q1) resolved by user (single header + internal aisle sort).
