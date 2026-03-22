# Story Map: Grocery Smart List

## User: Carlos Rivera, household grocery planner
## Goal: Reduce grocery trip prep from 20 minutes to under 5 minutes, and shop the store efficiently with a reliable offline list

---

## Backbone

| Manage Staples | Sweep Home | Consolidate Whiteboard | Switch View | Shop Store | Complete Trip |
|----------------|------------|----------------------|-------------|------------|---------------|
| Add staple item with metadata | See pre-loaded staples by area | Quick-add whiteboard items | Toggle home/store view | View items by aisle/section | Mark trip done |
| Edit staple metadata (aisle, area) | Uncheck staple not needed | Auto-suggest known items | Re-sort items by new grouping | Check off items in cart | Carry over unbought items |
| Mark item as staple or one-off | Add one-off during sweep | Assign metadata to new items | Show only non-empty sections | Navigate between sections | Re-queue staples for next trip |
| Remove staple from library | Navigate between areas | Batch entry mode | Preserve check-off across views | Skip section with unchecked items | Clear purchased one-offs |
| Import initial staples | Track sweep progress | | Switch back to home view | Uncheck mistaken check-off | Show trip summary |
| | | | | Handle app restart offline | |

---

## Walking Skeleton

The thinnest end-to-end slice covering ALL activities:

| Manage Staples | Sweep Home | Consolidate Whiteboard | Switch View | Shop Store | Complete Trip |
|----------------|------------|----------------------|-------------|------------|---------------|
| **Add staple item with house area and aisle** | **See pre-loaded staples by area** | **Quick-add item (manual entry)** | **Toggle home/store view** | **View items by aisle/section** | **Mark trip done with carryover** |

**Walking Skeleton stories**:
1. Add a staple item with name, house area, aisle/section, and type (staple/one-off)
2. Start a sweep and see staples pre-loaded by house area
3. Add an item manually (quick-add, no auto-suggest yet)
4. Toggle between home view (by area) and store view (by aisle)
5. Check off items in store view (offline-persisted)
6. Complete trip: carry over unbought items, re-queue staples

This skeleton validates the core hypothesis: **one list, two views, with staple auto-population**.

---

## Release 1: Efficient Home Sweep

**Target outcome**: Prep time drops from 20 minutes to under 5 minutes

| Manage Staples | Sweep Home | Consolidate Whiteboard | Switch View | Shop Store | Complete Trip |
|----------------|------------|----------------------|-------------|------------|---------------|
| Edit staple metadata | Uncheck staple not needed this trip | Auto-suggest known items | Show only non-empty sections | Navigate between sections | Clear purchased one-offs |
| | Add one-off during sweep | Assign metadata to new items | | Skip section with unchecked items | Show trip summary |
| | Navigate between areas | | | | |
| | Track sweep progress | | | | |

**Stories added**:
- Uncheck a staple not needed this trip (skip without deleting)
- Add one-off item during sweep with area and aisle assignment
- Navigate between house areas with progress tracking
- Auto-suggest from staple library during whiteboard entry
- Navigate between store sections with progress
- Skip partially-complete sections
- Trip summary with breakdown

---

## Release 2: Reliability and Polish

**Target outcome**: Zero data loss in-store; zero items forgotten between trips

| Manage Staples | Sweep Home | Consolidate Whiteboard | Switch View | Shop Store | Complete Trip |
|----------------|------------|----------------------|-------------|------------|---------------|
| Remove staple from library | | Batch entry mode | Switch back to home view | Uncheck mistaken check-off | |
| Import initial staples | | | Preserve check-off across views | Handle app restart offline | |

**Stories added**:
- Remove a staple from the library permanently
- Import initial staples in bulk (first-time setup)
- Batch entry mode for multiple whiteboard items
- Switch back to home view without losing state
- Uncheck items checked by mistake
- App restart preserves full trip state offline
