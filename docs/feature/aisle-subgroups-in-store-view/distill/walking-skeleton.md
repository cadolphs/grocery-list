# Acceptance Plan — aisle-subgroups-in-store-view

**Note**: D9 (DISCUSS) = no walking skeleton. Brownfield refinement. This document
is the per-slice executable acceptance plan. Each scenario maps to a story (US-01 /
US-02), a slice (slice-01 / slice-02), and an AC bullet quoted verbatim.

## Test Boundaries (see `wave-decisions.md`)

| Layer | File | Scope |
|---|---|---|
| Domain unit | `src/domain/item-grouping.test.ts` | `partitionSectionByAisle` — pure-function tests for partition shape, ordering, collapse, per-aisle counts |
| Component | `src/ui/AisleSection.test.tsx` | Render branches (flat vs sub-grouped), divider/badge presence, per-aisle progress + ✓ |
| Regression gate | `src/ui/StoreView.test.tsx` (existing) | Stays green; section-level ordering unchanged (D-NOREGRESS) |

TestIDs (from design): `aisle-section-{section}` (existing), `section-complete-{section}` (existing), `aisle-subgroup-{aisleKey | 'no-aisle'}` (new), `aisle-subgroup-complete-{aisleKey | 'no-aisle'}` (new).

---

## Slice 01 — Aisle Partition + Dividers + Badges (US-01)

### Domain unit scenarios — `partitionSectionByAisle`

#### Scenario: Multi-aisle section partitions into ascending aisle sub-groups
*US-01 AC: "Multi-aisle section card renders one sub-group per distinct `aisleNumber`, ascending."*

```gherkin
@US-01 @slice-01 @domain
Given a section group "Inner Aisles" with items at aisles 4, 5, and 7
When the section is partitioned by aisle
Then the result has three sub-groups
And the sub-group keys are 4, 5, 7 in that order
```

#### Scenario: All-null section collapses to flat
*US-01 AC: "All-null section card renders no sub-groups and no aisle badge."*

```gherkin
@US-01 @slice-01 @domain
Given a section group "Produce" where every item has no aisle number
When the section is partitioned by aisle
Then the result signals flat rendering
```

#### Scenario: Single-aisle section collapses to flat
*US-01 AC: "Single-aisle section card renders no sub-group and no aisle badge."*

```gherkin
@US-01 @slice-01 @domain
Given a section group "Frozen" where every item is at aisle 12
When the section is partitioned by aisle
Then the result signals flat rendering
```

#### Scenario: Mixed numeric + null section places null group at the tail
*US-01 AC: "Mixed null + numeric section places the null sub-group at the tail with badge `No aisle`."*

```gherkin
@US-01 @slice-01 @domain
Given a section group "Inner Aisles" with items at aisles 4 and 5
And one item in "Inner Aisles" with no aisle number
When the section is partitioned by aisle
Then the sub-group keys are 4, 5, then no-aisle in that order
```

#### Scenario: Item input order preserved inside each aisle sub-group
*US-01 AC: "Item input order is preserved inside each aisle sub-group (existing tie-break behaviour)."*

```gherkin
@US-01 @slice-01 @domain
Given a section group "Inner Aisles" where aisle 4 contains items "Bread" then "Pasta" in input order
When the section is partitioned by aisle
Then the aisle-4 sub-group's items are "Bread" then "Pasta" in that order
```

### Component render scenarios — `AisleSection`

#### Scenario: Multi-aisle section renders divider + badge per aisle group
*US-01 AC: "Each sub-group is preceded by a divider with a numeric aisle badge."*

```gherkin
@US-01 @slice-01 @component
Given Carlos has trip items in "Inner Aisles" at aisles 4, 5, and 7
When the "Inner Aisles" card renders
Then a sub-group node is present for each of aisles 4, 5, 7
And the on-screen aisle badges read "4", "5", "7" in that order
```

#### Scenario: All-null section renders flat — no sub-group nodes
*US-01 AC: "All-null section card renders no sub-groups and no aisle badge."*

```gherkin
@US-01 @slice-01 @component
Given Carlos has trip items in "Produce", all with no aisle number
When the "Produce" card renders
Then no sub-group node is present
And no aisle badge is shown
```

#### Scenario: Single-aisle section renders flat — no badge
*US-01 AC: "Single-aisle section card renders no sub-group and no aisle badge."*

```gherkin
@US-01 @slice-01 @component
Given Carlos has trip items in "Frozen", all at aisle 12
When the "Frozen" card renders
Then no sub-group node is present
And no "12" badge is shown
```

#### Scenario: Mixed section places `No aisle` tail at the end
*US-01 AC: "Mixed null + numeric section places the null sub-group at the tail with badge `No aisle`."*

```gherkin
@US-01 @slice-01 @component
Given Carlos has trip items in "Inner Aisles" at aisles 4 and 5
And one item in "Inner Aisles" with no aisle number
When the "Inner Aisles" card renders
Then sub-group nodes appear for aisles 4, 5, and no-aisle in that order
And the tail badge reads "No aisle"
```

#### Scenario: Section header is unchanged on the sub-grouped branch (D-NOREGRESS)
*US-01 AC: implied by D-NOREGRESS — section-level header preserved.*

```gherkin
@US-01 @slice-01 @component @noregress
Given Carlos has trip items in "Inner Aisles" at aisles 4 and 5 totalling 5 items, 2 checked
When the "Inner Aisles" card renders
Then the section header reads "Inner Aisles"
And the section-level progress reads "2 of 5"
And no section-level checkmark is shown
```

---

## Slice 02 — Per-Aisle Progress + Completion Checkmark (US-02)

### Domain unit scenarios — `partitionSectionByAisle` (counts)

#### Scenario: Each aisle sub-group reports its own checked / total counts
*US-02 AC: "Each aisle sub-group renders `checkedCount of totalCount` for items within that aisle only."*

```gherkin
@US-02 @slice-02 @domain
Given a section group "Inner Aisles" where aisle 4 has 3 items with 2 checked
And aisle 5 has 2 items with 0 checked
When the section is partitioned by aisle
Then the aisle-4 sub-group reports 2 checked of 3 total
And the aisle-5 sub-group reports 0 checked of 2 total
```

#### Scenario: `No aisle` tail group reports its own counts
*US-02 AC: "`No aisle` tail group in a mixed section also reports its own progress + checkmark."*

```gherkin
@US-02 @slice-02 @domain
Given a section group "Inner Aisles" with aisle 4 (1 item, 1 checked) and one item with no aisle (unchecked)
When the section is partitioned by aisle
Then the no-aisle tail sub-group reports 0 checked of 1 total
```

### Component render scenarios — `AisleSection`

#### Scenario: Aisle sub-group displays its own progress text
*US-02 AC: "Each aisle sub-group renders `checkedCount of totalCount` for items within that aisle only."*

```gherkin
@US-02 @slice-02 @component
Given "Inner Aisles" aisle 4 has 3 needed items with 2 checked
When the "Inner Aisles" card renders
Then the aisle-4 sub-group shows "2 of 3"
And no aisle-4 completion checkmark is shown
```

#### Scenario: Aisle sub-group shows completion checkmark when fully checked
*US-02 AC: "Each aisle sub-group renders `✓` when `checkedCount === totalCount`."*

```gherkin
@US-02 @slice-02 @component
Given "Inner Aisles" aisle 4 has 3 needed items, all 3 checked
And "Inner Aisles" aisle 5 has 2 needed items, none checked
When the "Inner Aisles" card renders
Then the aisle-4 sub-group shows "3 of 3"
And the aisle-4 completion checkmark is shown
And the aisle-5 sub-group shows "0 of 2"
And no aisle-5 completion checkmark is shown
```

#### Scenario: Section-level checkmark unaffected by partial-aisle completion (D-NOREGRESS)
*US-02 AC: "Section-level `X of Y` and `✓` continue to reflect the section as a whole (no behaviour change)."*

```gherkin
@US-02 @slice-02 @component @noregress
Given "Inner Aisles" aisle 4 has 3 items, all checked
And "Inner Aisles" aisle 5 has 2 items, none checked
When the "Inner Aisles" card renders
Then the aisle-4 completion checkmark is shown
And the section-level progress reads "3 of 5"
And no section-level checkmark is shown
```

#### Scenario: Section-level checkmark shown when all aisles complete (D-NOREGRESS)
*US-02 AC: "Section header `✓` shown when all aisles in section complete (existing behaviour)."*

```gherkin
@US-02 @slice-02 @component @noregress
Given "Inner Aisles" aisle 4 has 3 items and aisle 5 has 2 items, all 5 checked
When the "Inner Aisles" card renders
Then both aisle-4 and aisle-5 completion checkmarks are shown
And the section-level checkmark is shown
And the section-level progress reads "5 of 5"
```

#### Scenario: All-null section shows no sub-group progress
*US-02 AC: "All-null and single-aisle sections render no sub-group progress (only section progress)."*

```gherkin
@US-02 @slice-02 @component @noregress
Given Carlos has trip items in "Produce", all with no aisle number, 1 of 4 checked
When the "Produce" card renders
Then no sub-group node is present
And the section-level progress reads "1 of 4"
```

#### Scenario: Single-aisle section shows no sub-group progress
*US-02 AC: "All-null and single-aisle sections render no sub-group progress (only section progress)."*

```gherkin
@US-02 @slice-02 @component @noregress
Given Carlos has trip items in "Frozen", all at aisle 12, 0 of 3 checked
When the "Frozen" card renders
Then no sub-group node is present
And the section-level progress reads "0 of 3"
```

#### Scenario: `No aisle` tail in mixed section reports its own progress and ✓
*US-02 AC: "`No aisle` tail group in a mixed section also reports its own progress + checkmark."*

```gherkin
@US-02 @slice-02 @component
Given "Inner Aisles" has aisle 4 (1 item, 0 checked) and one no-aisle item that is checked
When the "Inner Aisles" card renders
Then the no-aisle sub-group shows "1 of 1"
And the no-aisle completion checkmark is shown
And the aisle-4 sub-group shows "0 of 1"
And no aisle-4 completion checkmark is shown
```

---

## Scenario Index

| Slice | Domain | Component | Total |
|---|---|---|---|
| slice-01 (US-01) | 5 | 5 | 10 |
| slice-02 (US-02) | 2 | 7 | 9 |
| **Total** | **7** | **12** | **19** |

D-NOREGRESS scenarios: 5 (tagged `@noregress`). Edge cases covered: multi-aisle, all-null, single-aisle, mixed numeric + null tail, partial vs full aisle completion, partial vs full section completion.

## AC → Scenario Trace

Each scenario above quotes its source AC inline (italic line under the heading). Every AC bullet from `user-stories.md` US-01 (6 bullets) and US-02 (5 bullets) is covered by at least one scenario; the `@noregress` tag identifies D-NOREGRESS coverage of the section-level header carry-over from `section-order-by-section`.
