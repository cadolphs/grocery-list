<!-- markdownlint-disable MD024 -->
# User Stories: Aisle Subgroups in Store View

**Feature ID**: aisle-subgroups-in-store-view
**Date**: 2026-04-27
**Refines**: section-order-by-section
**Job Trace**: JS4 (Store Navigation) — already validated; JTBD skipped

---

## Context

Carlos walks the store section by section. Within a multi-aisle section like `Inner Aisles`, items are aisle-sorted but unlabelled. He cannot tell when he has crossed from aisle 4 to aisle 5. This feature partitions items inside each section card by aisle, with a visual divider + aisle badge between groups, and per-aisle progress.

Sections with no aisle data (e.g. `Produce`, all `aisleNumber: null`) and single-aisle sections render as today (no redundant sub-headers).

---

## US-01: Aisle Boundaries Visible Inside a Multi-Aisle Section

### Problem

`AisleSection` renders all items in `Inner Aisles` as one flat list, sorted by aisle ascending. Mid-shop, Carlos cannot tell which aisle he is standing in without re-checking each item card's aisle metadata.

### Who

- Carlos | Walking a multi-aisle section | Wants a clear "you are now in aisle N" cue.

### Solution

Partition items inside the section card by `aisleNumber`. Between aisle groups, render a divider line with a numeric aisle badge. Items within an aisle group remain in input order.

### Elevator Pitch

Before: Carlos cannot tell mid-shop when he crosses from aisle 4 to aisle 5 inside `Inner Aisles`.
After: open store view during a trip → sees `Inner Aisles` card with a horizontal divider and `4` badge above aisle-4 items, then a divider and `5` badge above aisle-5 items.
Decision enabled: Carlos confirms his physical position in the store and decides whether to keep walking or backtrack.

### Domain Examples

1. `Inner Aisles` has items at aisles 4, 5, 7. Card renders three sub-groups separated by dividers with badges `4`, `5`, `7`.
2. `Produce` has 4 items, all `aisleNumber: null`. Card renders flat — no divider, no badge.
3. `Frozen` has only items at aisle 12. Card renders flat — no divider, no `12` badge (single-aisle collapse).
4. `Inner Aisles` has aisle-4 items, aisle-5 items, and one item with `aisleNumber: null`. Card renders aisle-4 group, divider + `5` badge + aisle-5 group, divider + `No aisle` badge + null item at tail.

### UAT Scenarios (BDD)

#### Scenario: Multi-aisle section shows divider + badge between aisle groups

Given Carlos has trip items in `Inner Aisles` at aisles 4, 5, and 7
When Carlos opens the store view
Then the `Inner Aisles` card shows three aisle sub-groups
And a divider with badge `4` precedes the aisle-4 items
And a divider with badge `5` precedes the aisle-5 items
And a divider with badge `7` precedes the aisle-7 items
And aisle groups appear in ascending order

#### Scenario: All-null section renders flat

Given Carlos has trip items in `Produce`, all with `aisleNumber: null`
When Carlos opens the store view
Then the `Produce` card shows items directly under the section header
And no aisle divider or badge is rendered

#### Scenario: Single-aisle section renders flat

Given Carlos has trip items in `Frozen`, all with `aisleNumber: 12`
When Carlos opens the store view
Then the `Frozen` card shows items directly under the section header
And no `12` badge is rendered

#### Scenario: Mixed numeric + null section places null group last

Given Carlos has trip items in `Inner Aisles` at aisles 4 and 5
And one item in `Inner Aisles` with `aisleNumber: null`
When Carlos opens the store view
Then aisle-4 items appear first under badge `4`
And aisle-5 items appear next under badge `5`
And the null item appears last under badge `No aisle`

### Acceptance Criteria

- [ ] Multi-aisle section card renders one sub-group per distinct `aisleNumber`, ascending.
- [ ] Each sub-group is preceded by a divider with a numeric aisle badge.
- [ ] All-null section card renders no sub-groups and no aisle badge.
- [ ] Single-aisle section card renders no sub-group and no aisle badge.
- [ ] Mixed null + numeric section places the null sub-group at the tail with badge `No aisle`.
- [ ] Item input order is preserved inside each aisle sub-group (existing tie-break behaviour).

---

## US-02: Per-Aisle Progress Inside a Section

### Problem

Section card shows `X of Y` for the whole section. When Carlos finishes aisle 4 inside `Inner Aisles`, no on-screen cue marks "aisle 4 done." He must mentally compare aisle 4's item count to his memory of what he checked.

### Who

- Carlos | Working through a multi-aisle section | Wants closure when an aisle is done.

### Solution

Each aisle sub-group shows its own `checked of total` count and a `✓` when complete. Section-level progress and `✓` continue to behave exactly as today (sum across the whole section).

### Elevator Pitch

Before: Carlos has no on-screen confirmation that he finished aisle 4 in `Inner Aisles`.
After: open store view, check off the aisle-4 items in `Inner Aisles` → aisle-4 sub-group shows `3 of 3` and a `✓`, while section header still shows `3 of 8`.
Decision enabled: Carlos commits to leaving aisle 4 and walking to aisle 5.

### Domain Examples

1. `Inner Aisles` aisle 4 has 3 items, all checked. Aisle-4 sub-group shows `3 of 3 ✓`. Section header shows partial progress.
2. `Inner Aisles` aisle 5 has 2 items, 1 checked. Aisle-5 sub-group shows `1 of 2`, no checkmark.
3. All aisles in `Inner Aisles` complete. Each sub-group shows `✓`. Section header also shows `✓`.

### UAT Scenarios (BDD)

#### Scenario: Aisle sub-group reports its own progress

Given `Inner Aisles` aisle 4 has 3 needed items
And Carlos has checked off 2 of them
When Carlos views the store view
Then the aisle-4 sub-group displays `2 of 3`
And no aisle-4 checkmark is shown

#### Scenario: Aisle sub-group shows checkmark when fully checked

Given `Inner Aisles` aisle 4 has 3 needed items
When Carlos checks off the third aisle-4 item
Then the aisle-4 sub-group displays `3 of 3` and a `✓`
And the section header still reflects partial section progress (other aisles incomplete)

#### Scenario: Section-level checkmark is unchanged

Given `Inner Aisles` has aisle 4 (3 items) and aisle 5 (2 items)
When Carlos checks off all 5 items
Then both aisle-4 and aisle-5 sub-groups show `✓`
And the section header shows `✓`

### Acceptance Criteria

- [ ] Each aisle sub-group renders `checkedCount of totalCount` for items within that aisle only.
- [ ] Each aisle sub-group renders `✓` when `checkedCount === totalCount`.
- [ ] Section-level `X of Y` and `✓` continue to reflect the section as a whole (no behaviour change).
- [ ] All-null and single-aisle sections render no sub-group progress (only section progress).
- [ ] `No aisle` tail group in a mixed section also reports its own progress + checkmark.

---

## Outcome KPIs

See `outcome-kpis.md`.
