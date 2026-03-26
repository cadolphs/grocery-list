# Story Map: Edit Staple Location

## User: Carlos Rivera (household grocery planner)
## Goal: Correct a staple's house area and store location when things change

## Backbone

| Open Edit Sheet | Change Location | Save and Verify | Remove Staple |
|-----------------|-----------------|-----------------|---------------|
| Tap staple item to open edit | Change house area | Save with duplicate check | Remove staple from library |
| Pre-fill current values | Change store section | Update current trip item | Convert trip item to one-off |
| Show dynamic area list | Change aisle number | Persist to storage | |
| Section auto-suggest in edit | Change multiple fields at once | Reflect in both views | |

---

### Walking Skeleton

The thinnest end-to-end slice that proves editing works:

1. **Open Edit Sheet**: Tap a staple item in HomeView to open the edit bottom sheet with pre-filled values
2. **Change Location**: Change the house area of the staple
3. **Save and Verify**: Save the change, update staple library, see the item in its new area

This covers: domain (updateStaple), port (StapleStorage update), UI (edit sheet with pre-fill + save).

### Release 1: Core Edit (Walking Skeleton)
- Tap staple to open edit sheet with pre-filled area, section, aisle
- Change house area, section, or aisle
- Save changes with duplicate detection
- Updated staple visible in HomeView and StoreView
- Cancel without saving

**Target outcome**: Carlos can correct staple locations in under 10 seconds

### Release 2: Full Edit Experience
- Remove staple from edit sheet (with confirmation)
- Current trip item updates when staple is edited
- Section auto-suggest works in edit mode
- One-off items are not editable as staples

**Target outcome**: Carlos trusts the edit flow handles all edge cases without data loss

## Scope Assessment: PASS -- 4 stories, 1 bounded context (Staple Management), estimated 4-5 days
