<!-- markdownlint-disable MD024 -->
# User Stories: Section-Keyed Ordering

**Feature ID**: section-order-by-section
**Date**: 2026-04-27
**Refines**: store-section-order
**Job Trace**: JS4 (Store Navigation) — already validated, JTBD skipped

---

## Context

Today the custom-order list shows one row per (section, aisleNumber) composite. Carlos
sees `Aisle 4: Inner Aisles`, `Aisle 5: Inner Aisles`, `Aisle 7: Inner Aisles` as three
separate draggable rows. He wants section to be the unit of order, with aisle as
internal sub-order. So custom-order screen lists `Inner Aisles` once. In the store
view, items in `Inner Aisles` render under one header, internally sorted by aisle
ascending.

Existing stored composite-key orders are wiped on upgrade (single user, minimal data).

---

## US-01: Custom Order Screen Lists Sections, Not Composite Rows

### Problem
`SectionOrderSettingsScreen` renders one row per `section::aisleNumber` composite key.
`Inner Aisles` aisles 4, 5, 7 = three rows. Reordering one of them moves only that
aisle relative to itself — meaningless when the user thinks of `Inner Aisles` as a
single block on his walk.

### Who
- Carlos | Setting up walking order | Wants to reorder by section, not aisle.

### Solution
Section name = ordering key. Screen lists each unique section once. Drag/up/down
reorders sections.

### Elevator Pitch
Before: Carlos cannot reorder `Inner Aisles` as a single block — he sees three rows.
After: open `Store Section Order` settings → sees `Inner Aisles` listed once → moves it.
Decision enabled: Carlos commits a section walking order without per-aisle micromanagement.

### Domain Examples
1. Staples cover sections `{Inner Aisles@4, Inner Aisles@5, Inner Aisles@7, Deli@null, Produce@null}`. Settings shows 3 rows: `Inner Aisles`, `Deli`, `Produce`.
2. Carlos moves `Produce` to top. New order: `[Produce, Inner Aisles, Deli]`.
3. Carlos adds a staple in `Inner Aisles` aisle 12. Settings still shows the same 3 rows; no new row appears.

### UAT Scenarios (BDD)

#### Scenario: Section appears once regardless of aisle count
Given Carlos has staples in `Inner Aisles` at aisles 3, 4, 5
When Carlos opens `Store Section Order`
Then `Inner Aisles` is listed exactly once
And no row contains an aisle number

#### Scenario: Reorder moves the whole section
Given Carlos has order `[Inner Aisles, Deli, Produce]`
When Carlos taps Down on `Inner Aisles`
Then the new order is `[Deli, Inner Aisles, Produce]`
And the change persists across reload

#### Scenario: Adding a new aisle within an existing section does not add a row
Given the order is `[Inner Aisles, Deli]`
And `Inner Aisles` already contains aisle 4
When Carlos saves a staple at `Inner Aisles` aisle 7
Then the section list still has 2 rows: `Inner Aisles`, `Deli`

### Acceptance Criteria
- [ ] Section list renders one row per unique section name (not per composite key).
- [ ] Row labels show section name only (no `Aisle N:` prefix).
- [ ] Reorder operations on a section move all aisles within that section together in store view.
- [ ] Order persists across app restart.
- [ ] New aisle inside an existing section produces no new section row.

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Configures walking order at section grain
- **By how much**: Number of rows in settings ≤ number of distinct section names
- **Measured by**: Manual count vs. staple section diversity
- **Baseline**: Today rows = distinct (section, aisle) pairs

### Technical Notes
- New ordering key: `section` (string), not `section::aisleNumber`.
- `appendNewSections` operates on section names.
- `useSectionOrder` storage schema migrates by wipe on first read of legacy shape (single-user, minimal data).
- `parseSectionKey` and `toSectionKey` removed from `SectionOrderSettingsScreen` (no longer composite).

---

## US-02: Store View Groups by Section, Aisles Ascending Inside

### Problem
With section-keyed ordering, the store view must render one header per section even
when that section spans multiple aisle numbers. Items inside the section header sort
by aisle ascending (then by name within an aisle, preserving existing tie-break).

### Who
- Carlos | Shopping in store | Wants `Inner Aisles` to appear as one collapsible block sorted internally by aisle.

### Solution
Group trip items by section name (not composite). Sort sections by custom order. Sort
items within a section by aisle number ascending (nulls last), then by current
intra-aisle ordering.

### Elevator Pitch
Before: Carlos sees `Aisle 4: Inner Aisles`, `Aisle 5: Inner Aisles`, `Aisle 7: Inner Aisles` as three separate cards in store view.
After: open store view → sees one `Inner Aisles` card → items inside ordered by aisle 4 → 5 → 7.
Decision enabled: Carlos walks `Inner Aisles` once, top-to-bottom, without re-finding the section.

### Domain Examples
1. Trip items: `Bread@Inner Aisles@4`, `Pasta@Inner Aisles@5`, `Soap@Inner Aisles@7`, `Apple@Produce@null`. Custom order `[Inner Aisles, Produce]`. Render: one `Inner Aisles` card containing Bread, Pasta, Soap (in that order); one `Produce` card containing Apple.
2. Same trip, custom order `[Produce, Inner Aisles]`. Render: `Produce` first, then `Inner Aisles`.
3. Section `Inner Aisles` includes both aisle-numbered (4, 5) and null-aisle items. Null sorts after numbered within the section block.

### UAT Scenarios (BDD)

#### Scenario: Single header per section
Given trip has items at `Inner Aisles` aisles 4, 5, 7
When Carlos opens store view
Then exactly one `Inner Aisles` card is rendered
And it contains all three items in aisle ascending order

#### Scenario: Custom order sorts sections
Given custom order is `[Produce, Inner Aisles]`
And trip has items in both sections
When Carlos opens store view
Then `Produce` card precedes `Inner Aisles` card

#### Scenario: Null aisle sorts last within section
Given trip items at `Inner Aisles` aisle 4 and `Inner Aisles` aisle null
When Carlos opens store view
Then within the `Inner Aisles` card, the aisle-4 item appears before the null-aisle item

#### Scenario: No custom order falls back to alphabetical sections
Given no custom order is set
When Carlos opens store view
Then sections appear alphabetically (single header per section, aisles ascending within)

### Acceptance Criteria
- [ ] `groupByAisle` (or replacement) returns one group per unique section name.
- [ ] Within a section group, items sort by aisle ascending, nulls last.
- [ ] `sortByCustomOrder` keys on section name.
- [ ] Store view renders one card per section, not per (section, aisle) pair.
- [ ] Default-sort fallback (no custom order) uses alphabetical section name.

### Outcome KPIs
- **Who**: Carlos
- **Does what**: Walks the store using one card per section
- **By how much**: Section cards in store view = distinct section names on trip
- **Measured by**: Manual visual count
- **Baseline**: Today section cards = distinct (section, aisle) pairs

### Technical Notes
- `AisleGroup` shape: drop `aisleNumber` from group key. Items inside retain their `storeLocation.aisleNumber` for intra-section sort.
- Refactor `compareAisleGroups` to compare by section name only.
- Update `StoreView.tsx` keying — current key `${aisleGroup.aisleNumber}-${aisleGroup.section}` becomes section-only.
- Stryker mutation testing applies (domain change).

---

## US-03: Auto-Append Operates at Section Grain

### Problem
Adding a one-off in a brand-new section (e.g. `Sushi Bar`) must auto-append the section
to the custom order. Adding a new aisle inside an existing section (`Inner Aisles` 12,
when `Inner Aisles` already in order) must NOT mutate the order.

### Who
- Carlos | Adding items mid-trip | Wants order updates only when a truly new section appears.

### Solution
`appendNewSections` keyed by section name. New section name = append. Known section name (any aisle) = no-op.

### Elevator Pitch
Before: Adding `Inner Aisles` aisle 12 (new aisle, existing section) appends a redundant `Inner Aisles::12` row.
After: add a one-off `Sushi Bar` item → `Sushi Bar` appears at end of section list. Add `Inner Aisles` aisle 12 → list unchanged.
Decision enabled: Carlos trusts that section list = walking-order spine, never bloated by aisle additions.

### Domain Examples
1. Order `[Inner Aisles, Deli]`. Add staple at `Sushi Bar@null`. Order becomes `[Inner Aisles, Deli, Sushi Bar]`.
2. Order `[Inner Aisles, Deli]`. Add staple at `Inner Aisles@12`. Order stays `[Inner Aisles, Deli]`.
3. Order `[]` (no custom order). Add staples in `Deli`, `Produce`. Order remains `null` (no auto-create when none exists).

### UAT Scenarios (BDD)

#### Scenario: New section appends
Given the section order is `[Inner Aisles, Deli]`
When Carlos saves a staple at `Sushi Bar` aisle null
Then the order becomes `[Inner Aisles, Deli, Sushi Bar]`

#### Scenario: New aisle in existing section is a no-op
Given the section order is `[Inner Aisles, Deli]`
And `Inner Aisles` already contains aisle 4
When Carlos saves a staple at `Inner Aisles` aisle 12
Then the section order remains `[Inner Aisles, Deli]`

#### Scenario: Auto-append skipped when no custom order exists
Given no custom order is set
When Carlos saves a staple at `Sushi Bar`
Then the order remains unset (default sort still applies)

### Acceptance Criteria
- [ ] `appendNewSections(currentOrder, knownSectionNames)` dedupes by section name.
- [ ] New aisle within a known section produces zero diff in stored order.
- [ ] Appending happens only when a custom order exists; otherwise no-op.

### Technical Notes
- `appendNewSections` signature unchanged; semantics narrowed to section name keys.
- Call sites: `StoreView` effective-order build, `SectionOrderSettingsScreen` derived list.

---

## US-04: Migration Wipes Legacy Composite Order

### Problem
Stored `section_order` from store-section-order is a list of composite `section::aisle`
keys. Reading it as section names produces garbage (`Inner Aisles::4` ≠ section name).

### Who
- Carlos | First launch after upgrade | Wants no broken order rendering.

### Solution
On first load post-upgrade, detect legacy shape (any entry containing `::`) and wipe.
Order returns to `null` → default sort. Carlos rebuilds in seconds (single user, minimal data, confirmed acceptable).

### Elevator Pitch
Before: opening `Store Section Order` shows nonsensical `Inner Aisles::4` rows.
After: launch app post-upgrade → settings shows clean section list in default order, ready to reorder.
Decision enabled: Carlos restarts customization on a clean schema with no manual cleanup.

### UAT Scenarios (BDD)

#### Scenario: Legacy composite order is wiped
Given local storage has `section_order = ["Inner Aisles::4", "Deli::null"]`
When the app loads `useSectionOrder` for the first time on the new build
Then storage is cleared
And `order` reports `null`

#### Scenario: Already-migrated order is preserved
Given local storage has `section_order = ["Inner Aisles", "Deli"]`
When the app loads `useSectionOrder`
Then storage is unchanged
And `order` reports `["Inner Aisles", "Deli"]`

### Acceptance Criteria
- [ ] Detection: any stored entry containing `::` = legacy shape.
- [ ] Action: wipe storage and return `null`.
- [ ] Section names without `::` pass through untouched.
- [ ] Migration runs once; subsequent loads are no-ops.

### Technical Notes
- Place migration in `useSectionOrder` (or storage adapter) at first read.
- Firestore + AsyncStorage adapters both impacted — test both.
- Single-user, minimal data: wipe acceptable per user confirmation.

---

## Out of Scope

- Section-to-section "Next" navigation (not implemented today; user not aware).
- Renaming sections.
- Per-store section orders (one global order, as in store-section-order).
