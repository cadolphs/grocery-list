# Slice 01: Single-Aisle Section Header Surfaces Aisle Badge

**Feature**: show-single-aisle-number
**Story**: US-01
**Job**: `store-navigation`
**Date**: 2026-05-07
**Slice type**: Single carpaccio slice (only slice for this feature)

---

## User-Observable Behaviour

When every needed item in a section card shares the same numeric `aisleNumber`, the section header now displays an `Aisle N` badge next to the section name and progress count. Other section types (multi-aisle, all-null, mixed numeric + null) are unchanged.

## Demo Script (single session, <60 s)

1. Open the app on a trip with at least one single-numeric-aisle section (e.g. `Frozen` with all items at aisle 12).
2. Open the store view.
3. Point at the `Frozen` section header → it now shows `Aisle 12`.
4. Scroll to a multi-aisle section (`Inner Aisles`) → header is unchanged, internal subgroup badges still present.
5. Scroll to an all-null section (`Produce`) → header is unchanged, no badge.

## In-Scope Changes

- `src/domain/item-grouping.ts` — derive or expose the "single numeric aisle" case from a `SectionGroup`. DESIGN wave decides whether this rides on `partitionSectionByAisle` or is a sibling helper.
- `src/ui/AisleSection.tsx` — when the section is single-numeric-aisle, render an `Aisle N` badge in the header alongside the existing progress count and `✓`.
- Unit tests for the derivation in `src/domain/`.
- Component test for the header rendering in `src/ui/AisleSection.test.tsx`.

## Out of Scope

- Any change to multi-aisle subgroup rendering.
- Any change to all-null section rendering.
- Persistence, schema migration, port surface, settings UI.

## Acceptance Criteria (mirrors US-01)

- [ ] All-numeric-same-aisle section: header shows `Aisle N` badge; no internal subgroup.
- [ ] All-null section: header unchanged; no badge.
- [ ] Multi-aisle section: header unchanged; existing subgroup rendering preserved.
- [ ] Mixed numeric + null section: header unchanged; renders as multi-aisle with `No aisle` tail.
- [ ] Section-level `X of Y` and `✓` unchanged in position and format.

## Estimate

<1 day. Single component + helper edit, plus tests. No infrastructure work.

## Risks

- Visual regression in the existing single-aisle flat-render branch if the header layout is restructured. Mitigation: snapshot/component tests covering all four section shapes.
- Reversal of `aisle-subgroups-in-store-view` Q5b — confirmed intentional in feature-delta D7.
