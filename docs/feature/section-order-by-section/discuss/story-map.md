# Story Map: Section-Keyed Ordering

**Feature ID**: section-order-by-section

## Backbone

| Activity | Stories |
|----------|---------|
| Configure section order | US-01 |
| Shop the trip | US-02 |
| Add new items mid-flow | US-03 |
| Upgrade existing build | US-04 |

## Walking Skeleton

End-to-end thin slice = US-04 + US-02 + US-01 (in that delivery order). Migration must
land first to avoid garbage state. Then the store view rendering and settings screen
swap together.

## Carpaccio Slices

### Slice 01: Migrate + Group by Section in Store View
- **Goal**: Trip rendering shows one card per section, internal aisle ascending; legacy storage wiped.
- **IN scope**: US-04 (migration), US-02 (group + sort).
- **OUT scope**: Settings screen UI changes (still shows composites until next slice).
- **Learning hypothesis**: Disproves "section-keyed grouping breaks intra-section sort" if items render in wrong order.
- **AC**: Domain unit tests pass; manual store-view check with live trip data shows one `Inner Aisles` card with items in aisle ascending order.
- **Effort**: ≤4 hours.
- **Reference class**: prior `store-section-order` domain delta (~3 hours).

### Slice 02: Settings Screen Section-Only Rows + Auto-Append Narrowing
- **Goal**: Settings screen lists sections only, drag/up/down operates on sections, auto-append narrows to section names.
- **IN scope**: US-01, US-03.
- **OUT scope**: nothing remaining.
- **Learning hypothesis**: Disproves "user can complete reorder in <30s" if test reorder takes longer.
- **AC**: Settings screen test renders one row per section; reorder + reload preserves order; adding new aisle in known section produces no row diff.
- **Effort**: ≤3 hours.
- **Reference class**: `SectionOrderSettingsScreen` from store-section-order (~3 hours).

## Carpaccio Taste Tests

| Test | Result |
|------|--------|
| Slice ships 4+ new components? | No — both slices touch <3 files of changed shape. ✓ |
| Every slice depends on a new abstraction? | No new abstractions; refactoring composite-key shape. ✓ |
| Does any slice disprove a pre-commitment? | Yes — Slice 01 disproves grouping correctness; Slice 02 disproves UX simplification claim. ✓ |
| Synthetic data only? | No — uses Carlos's actual staple library. ✓ |
| Two slices identical except scale? | No. ✓ |

## Dogfood

Carlos uses the build daily; both slices dogfood within the day they ship.
