# Story Map: Store Section Ordering

## User: Carlos Rivera, household grocery planner
## Goal: Make the store view match his physical walking path so he shops without backtracking

---

## Backbone

| Manage Section Order | View Store in Custom Order | Navigate Sections in Custom Order |
|---------------------|---------------------------|----------------------------------|
| See all known sections in settings | Store view uses custom order | Next button follows custom order |
| Reorder sections by drag-and-drop | Empty sections hidden as before | Skip sections with no items |
| Auto-append new sections to end | Section item counts accurate | |
| Reset to default order | | |

---

## Walking Skeleton

The thinnest end-to-end slice covering ALL activities:

| Manage Section Order | View Store in Custom Order | Navigate Sections in Custom Order |
|---------------------|---------------------------|----------------------------------|
| **Reorder sections by drag-and-drop** | **Store view uses custom order** | **Next button follows custom order** |

**Walking Skeleton stories**:
1. Reorder store sections via drag-and-drop in a settings screen
2. Store view displays sections in custom order instead of default sort
3. "Next section" navigation follows custom order

This skeleton validates the core hypothesis: **custom section ordering makes the store view match Carlos's physical walking path**.

---

## Release 1: Complete Section Management

**Target outcome**: Carlos can fully manage his section order, including handling new sections and resetting

| Manage Section Order | View Store in Custom Order | Navigate Sections in Custom Order |
|---------------------|---------------------------|----------------------------------|
| See all known sections with current order | Empty sections hidden with custom order | Skip sections with no items in custom order |
| Auto-append new sections to end | | |
| Reset to default order | | |

**Stories added**:
- View all known sections in settings with their current order
- New section from item metadata auto-appends to end of custom order
- Reset custom order to default (aisle ascending, then alpha)
- Empty sections hidden correctly when using custom order

---

## Scope Assessment: PASS -- 5 stories, 1 bounded context (domain grouping + settings storage), estimated 4-5 days

The feature is right-sized for a single delivery cycle:
- 5 user stories total (3 walking skeleton + 2 release 1)
- Single bounded context: section ordering (domain sort logic + local storage)
- 3 integration points: store view sort, section navigation, settings screen
- Both walking skeleton and release 1 can ship in one cycle
