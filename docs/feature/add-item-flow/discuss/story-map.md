# Story Map: Add Item Metadata Flow

## User: Carlos Rivera (household grocery planner)
## Goal: Add new items with proper metadata without breaking flow

---

## Backbone

| Type Name | Open Metadata | Fill Metadata | Confirm & Return |
|-----------|--------------|---------------|-----------------|
| Type item name in QuickAdd | Tap "Add as new item" to open bottom sheet | Select type, area, section, aisle | Tap "Add Item", see confirmation |
| See "no match" prompt | See smart defaults pre-filled | Use section auto-suggest | Item appears in correct area |
| | | Skip metadata (add with defaults) | Toast confirms action |
| | | Handle duplicate detection | |

---

### Walking Skeleton

The thinnest end-to-end slice that connects all four activities:

1. **Type Name**: Carlos types "Oat milk", no staple matches, sees "Add as new item" prompt
2. **Open Metadata**: Carlos taps prompt, bottom sheet opens with item name pre-filled
3. **Fill Metadata**: Carlos manually selects type (staple/one-off), area, and section (no auto-suggest, no smart defaults yet)
4. **Confirm & Return**: Carlos taps "Add Item", item added to trip (and staple library if staple), bottom sheet dismisses, QuickAdd clears

This delivers the core behavior: a new item gets full metadata through a bottom sheet. No smart defaults, no section auto-suggest, no skip shortcut, no duplicate detection. Those are enhancements.

---

### Release 1: Smart Defaults (reduce friction)

Target outcome: Metadata entry takes under 5 seconds during sweep because defaults are pre-filled.

- **Context-aware area pre-selection**: During sweep, area defaults to active area
- **Context-aware type default**: Sweep = staple, whiteboard = one-off
- **Skip metadata shortcut**: "Skip, add with defaults" for items Carlos will classify later

---

### Release 2: Section Intelligence (reduce thinking)

Target outcome: Carlos rarely types a full section name because suggestions do the work.

- **Section auto-suggest from previously used sections**: Type "Da" and see "Dairy"
- **Section suggestion shows item count** (e.g., "Dairy (12 items)") for confidence

---

### Release 3: Safety Nets (prevent errors)

Target outcome: Zero misclassified items per trip.

- **Duplicate staple detection**: Warn when adding a staple that already exists in same area
- **"Add to trip instead" from duplicate warning**: Quick recovery path

---

## Scope Assessment: PASS -- 6 stories, 1 bounded context (item management), estimated 5-6 days
