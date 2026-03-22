<!-- markdownlint-disable MD024 -->
# User Stories: Store Section Ordering

**Feature ID**: store-section-order
**Date**: 2026-03-22

---

## Walking Skeleton Stories

---

## US-SSO-01: Reorder Store Sections

### Problem
Carlos Rivera shops at one store bi-weekly. His store's walking path starts near Health & Beauty, passes the Deli, then goes through numbered aisles, and ends at Produce. But the app sorts numbered aisles first (ascending), then named sections alphabetically. Every trip, Carlos mentally translates between the app order and his actual walk, causing confusion and occasional backtracking.

### Who
- Carlos Rivera | Bi-weekly shopper at one store | Wants sections to match his physical walking path

### Solution
A Store Layout Settings screen where Carlos can drag sections into the order he walks through the store.

### Domain Examples
#### 1: Drag Deli Before Numbered Aisles
Carlos opens Store Layout Settings. Deli is at position 7 (after all numbered aisles). He drags Deli to position 2, right after Health & Beauty. The list updates and saves automatically.

#### 2: Move Produce to Last Position
Carlos wants Produce at the end because it is near checkout. He drags Produce from position 7 to position 9 (last). Position numbers update immediately.

#### 3: Rearrange Multiple Sections
Carlos rearranges his entire section list in one session: Health & Beauty first, then Deli, then Dairy (Aisle 3), Canned Goods (Aisle 5), Paper & Soap (Aisle 7), Baking (Aisle 12), Bakery, Frozen, Produce. Each drag auto-saves.

### UAT Scenarios (BDD)

#### Scenario: View all sections in settings
Given Carlos has staple items in 9 sections (5 numbered aisles + 4 named sections)
When Carlos opens Store Layout Settings
Then all 9 sections are listed with drag handles
And sections show their display name (e.g., "Aisle 3: Dairy", "Deli")

#### Scenario: Drag section to new position
Given Carlos is on Store Layout Settings
And "Deli" is at position 7
When Carlos drags "Deli" to position 2
Then "Deli" appears at position 2
And all sections between positions 2-7 shift down by one
And the new order is saved to local storage automatically

#### Scenario: Auto-save confirmation
Given Carlos has just dragged a section to a new position
Then Carlos sees "Order saved automatically"
And no explicit "Save" button is needed

#### Scenario: Order persists across app restart
Given Carlos has set a custom section order
And Carlos closes and reopens the app
When Carlos opens Store Layout Settings
Then sections appear in the custom order he set previously

### Acceptance Criteria
- [ ] Store Layout Settings screen lists all known sections from staple library and current trip
- [ ] Sections can be reordered via drag-and-drop
- [ ] Order saves automatically on each reorder (no explicit save action)
- [ ] Custom order persists to local storage and survives app restart
- [ ] All sections remain in the list after reordering (no section lost)

### Outcome KPIs
- **Who**: Carlos (bi-weekly shopper)
- **Does what**: Sets up custom section order matching his store walk
- **By how much**: One-time setup completed in under 2 minutes
- **Measured by**: Time from opening settings to returning to store view
- **Baseline**: N/A (no customization capability exists)

### Technical Notes
- New port: SectionOrderStorage (loadOrder, saveOrder) -- mirrors AreaStorage pattern
- Section key: composite of section name + aisle number (same as groupKey in item-grouping.ts)
- Sections derived from union of staple library sections and current trip item sections
- Must not modify staple items or trip items -- section order is a separate concern

### Job Story Trace
- JS4 (Store Navigation)

---

## US-SSO-02: Store View Uses Custom Section Order

### Problem
Carlos has set his preferred section order in settings, but the store view still sorts by aisle number ascending then alphabetically. The disconnect between his configured order and what he sees makes the settings feel broken and useless.

### Who
- Carlos Rivera | Arriving at the store, switching to store view | Wants to see sections in the order he configured

### Solution
When a custom section order exists, the store view uses it instead of the default sort. Sections without items on the current trip are still hidden.

### Domain Examples
#### 1: Custom Order Applied
Carlos set his order as: Health & Beauty, Deli, Dairy, Canned Goods, Paper & Soap, Baking, Bakery, Frozen, Produce. He opens store view and sees Health & Beauty at the top, Produce at the bottom.

#### 2: Empty Sections Hidden
Carlos has custom order with 9 sections but only has items in Dairy, Deli, and Produce this trip. Store view shows 3 sections in custom order: Deli (position 2), Dairy (position 3), Produce (position 9).

#### 3: No Custom Order Fallback
Elena (Carlos's wife) uses the app for the first time. She has not set a custom order. Store view uses the default sort (aisle ascending, then alpha). Everything works as before.

### UAT Scenarios (BDD)

#### Scenario: Store view uses custom order
Given Carlos has custom section order: Health & Beauty, Deli, Dairy, Canned Goods, Paper & Soap, Baking, Bakery, Frozen, Produce
And Carlos has items in all 9 sections
When Carlos opens the store view
Then sections appear in the custom order

#### Scenario: Empty sections hidden with custom order
Given Carlos has custom section order with 9 sections
And the current trip has items only in Dairy, Deli, and Produce
When Carlos opens the store view
Then only 3 sections are shown
And they appear as: Deli, Dairy, Produce (custom order preserved)

#### Scenario: Fallback to default when no custom order
Given no custom section order has been set
When Carlos opens the store view
Then sections appear in default order: numbered aisles ascending, then named sections alphabetically

#### Scenario: Custom order does not affect home view
Given Carlos has custom section order
When Carlos switches to home view
Then items are still grouped by house area (not affected by section order)

### Acceptance Criteria
- [ ] Store view uses custom section order when one exists
- [ ] Default sort used when no custom order exists (backward compatible)
- [ ] Empty sections still hidden regardless of ordering method
- [ ] Home view is unaffected by section order settings
- [ ] View renders in under 200ms (no performance regression from custom sort)

### Outcome KPIs
- **Who**: Carlos (bi-weekly shopper)
- **Does what**: Sees store sections in his walking order on every trip
- **By how much**: Zero mental translation between app order and store layout
- **Measured by**: Number of times Carlos backtracks to a previous section per trip
- **Baseline**: 1-2 backtracks per trip (estimated from wrong section order)

### Technical Notes
- Modify groupByAisle or add new groupByCustomOrder function that accepts section order
- Section order is a list of section keys; items not in the list sort to the end
- Must maintain existing sort as fallback (no custom order = current behavior)
- Pure function: takes items + optional section order, returns AisleGroup[]

### Job Story Trace
- JS4 (Store Navigation)

---

## US-SSO-03: Section Navigation Follows Custom Order

### Problem
Carlos has set a custom section order so the store view matches his walk. But the "Next" button still points to the next aisle by number, not the next section in his custom order. He taps "Next" after Health & Beauty expecting Deli, but gets Aisle 3: Dairy instead.

### Who
- Carlos Rivera | In-store, finishing a section | Wants "Next" to lead to the section he physically walks to next

### Solution
The "Next section" button and section-to-section navigation follow the custom section order, skipping sections with no items.

### Domain Examples
#### 1: Next Follows Custom Order
Carlos finishes Health & Beauty (position 1 in custom order). He taps "Next." Deli opens (position 2 in custom order), not Aisle 3: Dairy (which was first in default order).

#### 2: Skip Empty Section in Custom Order
Carlos's custom order is: Health & Beauty, Deli, Dairy, Produce. He has no items in Deli this trip. After finishing Health & Beauty, "Next" points to Dairy (skipping empty Deli).

#### 3: Last Section Has No Next
Carlos finishes Produce (last in custom order). There is no "Next" button. He sees "All sections complete" or similar.

### UAT Scenarios (BDD)

#### Scenario: Next button follows custom order
Given Carlos has custom order: Health & Beauty, Deli, Dairy, Produce
And Carlos has items in all 4 sections
And Carlos has completed all items in Health & Beauty
When Carlos sees the "Next" hint
Then it reads "Next: Deli (2 items)"
When Carlos taps "Next"
Then the Deli section opens

#### Scenario: Next skips empty sections
Given Carlos has custom order: Health & Beauty, Deli, Dairy, Produce
And Carlos has no items in Deli on this trip
And Carlos has completed Health & Beauty
When Carlos sees the "Next" hint
Then it reads "Next: Dairy" (skipping empty Deli)

#### Scenario: No next after last section
Given Carlos has custom order ending with Produce
And Carlos has completed all items in Produce
Then there is no "Next" button
And Carlos sees a completion indicator

#### Scenario: Section list shows custom order with progress
Given Carlos has custom order and has completed 3 of 5 sections with items
When Carlos returns to the section list
Then sections appear in custom order
And completed sections show checkmarks
And the next incomplete section is highlighted

### Acceptance Criteria
- [ ] "Next" button targets the next section in custom order that has items
- [ ] Empty sections are skipped in navigation
- [ ] Section list view respects custom order
- [ ] Last section in custom order shows completion indicator instead of "Next"
- [ ] Falls back to default navigation order when no custom order exists

### Outcome KPIs
- **Who**: Carlos (bi-weekly shopper)
- **Does what**: Navigates the store following his walking path without manual section selection
- **By how much**: "Next" button leads to correct physical next section 100% of the time
- **Measured by**: Number of times Carlos uses "Back to sections" to manually pick next section (lower = better)
- **Baseline**: Occasional manual section selection when default order did not match walk

### Technical Notes
- Navigation logic must consume the same section_order as the store view sort
- "Next" calculation: from current section, find next section in custom order that has items on trip
- Falls back to default order navigation when no custom order set

### Job Story Trace
- JS4 (Store Navigation), JS5 (In-Store Check-Off)

---

## Release 1 Stories

---

## US-SSO-04: New Section Auto-Appends to Custom Order

### Problem
Carlos has a custom section order for his 9 regular sections. While consolidating the whiteboard, he adds "Sushi rolls" in a new section "Sushi Bar" that does not exist in his order. If the new section is silently excluded from the store view or placed randomly, Carlos will miss sushi rolls during shopping.

### Who
- Carlos Rivera | Adding a new item with an unfamiliar section | Wants new sections handled gracefully without disrupting his existing order

### Solution
When an item is added with a section not in the custom order, that section is automatically appended to the end of the order.

### Domain Examples
#### 1: New Section from Quick-Add
Carlos adds "Sushi rolls" as a one-off in section "Sushi Bar." "Sushi Bar" is not in his custom order. It auto-appends to position 10 (after Produce, his current last section).

#### 2: New Section Visible in Settings
Carlos opens Store Layout Settings after adding the sushi item. "Sushi Bar" appears at position 10 with a "(new)" indicator. He can drag it to any position.

#### 3: Multiple New Sections
Carlos adds items in "Sushi Bar" and "Floral." Both auto-append in the order they were created: Sushi Bar at 10, Floral at 11.

### UAT Scenarios (BDD)

#### Scenario: New section auto-appends
Given Carlos has a custom order of 9 sections
When Carlos adds "Sushi rolls" with section "Sushi Bar"
And "Sushi Bar" is not in the existing section order
Then "Sushi Bar" is appended at position 10

#### Scenario: New section appears in store view
Given "Sushi Bar" was auto-appended to custom order
And "Sushi rolls" is on the current trip
When Carlos opens the store view
Then "Sushi Bar" appears after all previously ordered sections

#### Scenario: New section appears in settings
Given "Sushi Bar" was auto-appended to custom order
When Carlos opens Store Layout Settings
Then "Sushi Bar" appears at the bottom of the list
And Carlos can drag it to reposition

### Acceptance Criteria
- [ ] New sections auto-append to end of custom order
- [ ] Auto-append happens when item is added (not deferred to settings visit)
- [ ] New sections are visible in store view and settings immediately
- [ ] New sections can be repositioned via drag-and-drop like any other section

### Outcome KPIs
- **Who**: Carlos (bi-weekly shopper)
- **Does what**: Adds items in new sections without losing them in the store view
- **By how much**: Zero items invisible due to missing section in order
- **Measured by**: Count of items in sections not present in custom order (should be 0)
- **Baseline**: N/A (new feature)

### Technical Notes
- Detection: when saving a trip item or staple, check if section key exists in section_order
- If not present, append to section_order and persist
- Section key derivation must match the key used in store view grouping

### Job Story Trace
- JS4 (Store Navigation), JS3 (Staple Item Management)

---

## US-SSO-05: Reset Section Order to Default

### Problem
Carlos experimented with section reordering and made a mess of it. Or he changed stores and the old order is completely wrong. He wants to start over with the system default (aisle number ascending, named sections alphabetically) without manually dragging each section back.

### Who
- Carlos Rivera | Dissatisfied with current custom order | Wants a quick way to undo all customization

### Solution
A "Reset to Default Order" button in Store Layout Settings that clears the custom order and reverts to the system default sort.

### Domain Examples
#### 1: Reset After Messy Customization
Carlos rearranged sections but got confused about his actual store layout. He taps "Reset to Default Order," confirms, and sections return to aisle-number-first, alpha-second order.

#### 2: Cancel Accidental Reset
Carlos accidentally taps "Reset to Default Order." A confirmation dialog appears. He taps "Cancel" and his custom order is preserved.

#### 3: Reset Then Re-Customize
Carlos resets to default, then starts a fresh customization from the default order. He drags 3 sections and has a new custom order.

### UAT Scenarios (BDD)

#### Scenario: Reset with confirmation
Given Carlos has a custom section order
When Carlos taps "Reset to Default Order"
Then a confirmation dialog appears
And it explains the default order (numbered aisles ascending, then named sections alphabetically)

#### Scenario: Confirm reset clears custom order
Given Carlos is viewing the reset confirmation
When Carlos taps "Reset"
Then sections revert to default order in the settings list
And the store view shows default order
And the custom order is removed from local storage

#### Scenario: Cancel preserves custom order
Given Carlos is viewing the reset confirmation
When Carlos taps "Cancel"
Then the custom section order is unchanged
And Carlos returns to the settings list

### Acceptance Criteria
- [ ] "Reset to Default Order" button visible in Store Layout Settings
- [ ] Confirmation dialog prevents accidental reset
- [ ] Reset clears custom order from storage
- [ ] After reset, store view and navigation use default sort
- [ ] After reset, Carlos can create a new custom order

### Outcome KPIs
- **Who**: Carlos (bi-weekly shopper)
- **Does what**: Recovers from bad customization without manual per-section fixes
- **By how much**: Reset takes under 5 seconds (vs dragging 9 sections individually)
- **Measured by**: Time from tapping reset to seeing default order
- **Baseline**: N/A (no reset capability exists)

### Technical Notes
- Reset = delete section_order from local storage
- After reset, groupByAisle default sort takes over (existing compareAisleGroups function)
- No data migration needed -- items and staples are unaffected

### Job Story Trace
- JS4 (Store Navigation)
