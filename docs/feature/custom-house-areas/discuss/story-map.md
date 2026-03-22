# Story Map: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20
**User**: Carlos Rivera (and Ana Lucia Rivera, his sister with a different house layout)
**Goal**: Make house areas user-configurable so the sweep matches each household's actual rooms

---

## Changed Assumptions

The original grocery-smart-list DISCUSS wave decided:

> "House areas as fixed list -- 5 areas are stable; dynamic management is over-engineering for initial scope."

This feature reverses that decision. Rationale: different households have different rooms. The 5 original areas become defaults for new users.

---

## Backbone

| Access Settings | Add Area | Rename Area | Delete Area | Reorder Areas | Sweep with Custom Areas |
|---|---|---|---|---|---|
| Tap gear from home view | Type new area name | Edit existing area name | Choose reassignment target | Drag to reorder | See custom areas in home view |
| View current area list | Save new area | Preview affected staples | Confirm deletion | Save new order | See custom area count in progress |
| | Validate uniqueness | Save rename + propagate | Reassign staples and trip items | | Add staples to new areas |
| | | | Handle empty vs populated area | | Area picker shows custom list |

---

## Walking Skeleton

The thinnest end-to-end slice covering the core value: "make areas configurable."

| Access Settings | Add Area | Rename Area | Delete Area | Reorder Areas | Sweep with Custom Areas |
|---|---|---|---|---|---|
| **View area list in settings** | **Add area with name** | -- | -- | -- | **Home view reads dynamic area list** |

**Walking Skeleton stories**:

1. **View area list**: Open settings, see the 5 default areas
2. **Add a new area**: Type a name, save, it appears in the list
3. **Home view uses dynamic areas**: groupByArea and sweep progress read from the configurable list instead of hardcoded constants

This skeleton validates: **areas come from storage, not from code**.

---

## Release 1: Full Area CRUD

**Target outcome**: Users can fully customize their house layout

| Access Settings | Add Area | Rename Area | Delete Area | Reorder Areas | Sweep with Custom Areas |
|---|---|---|---|---|---|
| | Validate uniqueness | Edit name + propagate to staples | Delete empty area | Drag to reorder | Area picker in MetadataBottomSheet reads dynamic list |
| | Validate name length | Propagate to trip items | Delete area with staple reassignment | Order persists across restart | |
| | | Prevent rename to existing name | Prevent deleting last area | | |

**Stories added**:

- Validate area name (uniqueness, length, non-empty)
- Rename area with propagation to staples and trip items
- Delete empty area
- Delete area with staple reassignment
- Reorder areas with drag-and-drop
- Area picker reads dynamic list

---

## Release 2: Polish and Edge Cases

**Target outcome**: Bulletproof area management, no data loss edge cases

| Access Settings | Add Area | Rename Area | Delete Area | Reorder Areas | Sweep with Custom Areas |
|---|---|---|---|---|---|
| | | Rename during active trip | Delete during active trip | | Default area seeding on first launch |

**Stories added**:

- Rename propagates to in-flight trip items
- Delete reassigns in-flight trip items
- First-launch migration seeds 5 defaults

---

## Scope Assessment: PASS -- 7 stories, 2 contexts (area management + existing domain), estimated 5-7 days

The feature is right-sized for a single delivery cycle:

- 7 user stories across walking skeleton + release 1
- Touches 2 bounded contexts: area management (new) and existing domain logic (groupByArea, sweepProgress, MetadataBottomSheet)
- Walking skeleton requires 3 integration points (AreaStorage, groupByArea, sweepProgress)
- Estimated total effort: 5-7 days
- Single independent user outcome: "my sweep matches my house"
