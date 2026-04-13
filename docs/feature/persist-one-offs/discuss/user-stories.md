<!-- markdownlint-disable MD024 -->

# User Stories: persist-one-offs

## System Constraints

- `StapleItem.type` must be extended from literal `'staple'` to `'staple' | 'one-off'`
- One-off library entries use `houseArea: ''` (empty string) since they do not participate in the house sweep
- Existing `StapleStorage` port methods (`save`, `search`, `loadAll`, `remove`, `update`) must work with both types
- Firestore sync must handle the new type without breaking existing staple data
- `isDuplicate` check scoped by `(name, houseArea)` -- a staple "Butter" in "Fridge" and a one-off "Butter" with `houseArea: ''` are distinct entries

---

## US-01: Persist One-Off to Library on First Add

### Problem

Elena Ruiz is a weekly shopper who buys specialty items like tahini and rice paper wrappers every few weeks. She finds it tedious to re-enter the item name, store section, and aisle number each time she adds these items to a new trip. The store location data she entered last time is lost after the trip ends.

### Who

- Weekly shopper | Adding a one-off item during trip planning | Wants the app to remember this item for next time

### Solution

When a user adds a one-off item via the MetadataBottomSheet, also save it to the staple library with `type: 'one-off'` so it appears in future searches.

### Domain Examples

#### 1: Happy Path -- Elena adds tahini for the first time

Elena types "Tahini" in QuickAdd, taps Add, selects "One-off" in MetadataBottomSheet, enters section "International" and aisle 7, taps "Add Item." Tahini is added to the current trip AND saved to the library with `type: 'one-off'`, `storeLocation: { section: 'International', aisleNumber: 7 }`, `houseArea: ''`.

#### 2: Skip with defaults -- Elena adds birthday candles quickly

Elena types "Birthday Candles" in QuickAdd, taps Add, selects "One-off", and taps "Skip, add with defaults" without entering section or aisle. Birthday Candles is added to the trip with section "Uncategorized" and aisle null, AND saved to the library with the same defaults.

#### 3: Duplicate one-off -- Elena adds tahini again on same trip

Elena already added "Tahini" as a one-off this trip. She types "Tahini" again. The suggestion now appears (since it was just persisted). She can tap the suggestion instead of going through the full add flow. If she ignores the suggestion and tries to add via MetadataBottomSheet, the system should handle this gracefully (either update the existing entry or prevent duplicate library entries).

### UAT Scenarios (BDD)

#### Scenario: One-off item saved to library on first add

Given Elena is planning a new trip
And "Tahini" does not exist in the item library
When Elena adds "Tahini" as a one-off with section "International" and aisle 7
Then "Tahini" appears in the current trip as a one-off
And "Tahini" is saved to the item library with type "one-off"
And the library entry has section "International" and aisle 7

#### Scenario: One-off with skipped metadata still persisted

Given Elena is planning a new trip
When Elena adds "Birthday Candles" as a one-off using "Skip, add with defaults"
Then "Birthday Candles" appears in the current trip as a one-off
And "Birthday Candles" is saved to the item library with type "one-off"
And the library entry has section "Uncategorized" and aisle null

#### Scenario: Adding one-off does not create duplicate library entry

Given Elena previously added "Tahini" as a one-off (already in library)
When Elena adds "Tahini" as a one-off again via MetadataBottomSheet
Then only one "Tahini" one-off entry exists in the library
And the trip receives the item normally

#### Scenario: One-off persistence does not interfere with staple add

Given Elena adds "Olive Oil" as a staple in "Kitchen Cabinets" area
When the item is saved
Then "Olive Oil" is saved to the library with type "staple"
And "Olive Oil" is NOT saved with type "one-off"

### Acceptance Criteria

- [ ] Adding a one-off via MetadataBottomSheet saves it to the staple library with `type: 'one-off'`
- [ ] Skipping metadata (defaults) still persists the one-off to the library
- [ ] Duplicate one-off names do not create duplicate library entries
- [ ] Existing staple add flow is unaffected

### Outcome KPIs

- **Who**: Weekly shoppers who add one-off items
- **Does what**: One-off items are persisted to the library on first add
- **By how much**: 100% of one-off adds result in a library entry
- **Measured by**: Library entry count after one-off add
- **Baseline**: 0% of one-offs are persisted today

### Technical Notes

- `StapleItem.type` must change from `'staple'` to `'staple' | 'one-off'`
- `MetadataBottomSheet.handleSubmit` (one-off branch) must call a library save in addition to `onSubmitTripItem`
- `MetadataBottomSheet.handleSkip` must also trigger library save
- One-off library entries use `houseArea: ''`
- Existing `isDuplicate` check uses `(name, houseArea)` -- one-offs with `houseArea: ''` will not collide with staples unless a staple also has empty houseArea (not possible in current UI)
- Need to decide: does re-adding an existing one-off update the library entry's storeLocation, or keep the original? Start simple: keep original, user can edit later.

---

## US-02: Re-Add Persisted One-Off from QuickAdd Suggestions

### Problem

Elena Ruiz added tahini to a trip two weeks ago. Now she is planning a new trip and wants tahini again. She starts typing "Tah" expecting to see a suggestion, but currently one-offs are not persisted, so nothing appears. She must re-enter the name, section, and aisle from scratch.

### Who

- Returning shopper | Starting a new trip | Wants to quickly re-add a previously purchased one-off item

### Solution

Persisted one-off items appear in QuickAdd search suggestions. Selecting a one-off suggestion adds it to the trip with `itemType: 'one-off'` and the saved store location, without opening MetadataBottomSheet.

### Domain Examples

#### 1: Happy Path -- Elena re-adds tahini

Elena types "Tah" in QuickAdd on a new trip. The suggestion list shows "Tahini - International / Aisle 7 (one-off)". She taps it. Tahini is added to the trip as a one-off with section "International", aisle 7. No MetadataBottomSheet opens.

#### 2: Edge Case -- Multiple partial matches

Elena types "B" in QuickAdd. She sees "Bread - Bakery / Aisle 1" (staple), "Butter - Dairy / Aisle 2" (staple), "Birthday Candles - Uncategorized (one-off)". She taps "Birthday Candles" and it's added as a one-off.

#### 3: One-off already in trip

Elena already added "Tahini" to this trip. She types "Tah" again. The suggestion still appears, but tapping it does nothing (duplicate prevention, same as current staple behavior in `handleSelectSuggestion` which checks `alreadyInTrip`).

### UAT Scenarios (BDD)

#### Scenario: Persisted one-off appears in QuickAdd suggestions

Given Elena previously added "Tahini" as a one-off with section "International" and aisle 7
And Elena starts a new trip
When Elena types "Tah" in QuickAdd
Then a suggestion appears showing "Tahini" with location "International / Aisle 7"

#### Scenario: Selecting one-off suggestion adds to trip with saved location

Given Elena sees "Tahini" in the QuickAdd suggestions as a one-off
When Elena taps the "Tahini" suggestion
Then "Tahini" is added to the trip with itemType "one-off"
And the store location is section "International", aisle 7
And the MetadataBottomSheet does not open

#### Scenario: One-off suggestion not re-added if already in trip

Given Elena already has "Tahini" in the current trip
When Elena types "Tah" in QuickAdd and taps the "Tahini" suggestion
Then no duplicate "Tahini" is added to the trip

#### Scenario: One-off re-add does not appear in sweep areas

Given Elena re-added "Tahini" from a one-off suggestion
When Elena views the home screen in sweep mode
Then "Tahini" appears under "One-offs"
And "Tahini" does not appear under any house area section

### Acceptance Criteria

- [ ] Persisted one-offs appear in QuickAdd search results
- [ ] Tapping a one-off suggestion adds to trip with `itemType: 'one-off'` and saved store location
- [ ] MetadataBottomSheet does not open when selecting a one-off suggestion
- [ ] Duplicate one-offs are not added to the same trip
- [ ] Re-added one-offs appear in the one-offs section, not sweep areas

### Outcome KPIs

- **Who**: Returning shoppers re-adding specialty items
- **Does what**: Re-add a previously purchased one-off in one tap instead of re-entering all metadata
- **By how much**: Time to re-add a known one-off drops from ~15 seconds (type + open sheet + fill 2 fields + tap) to ~3 seconds (type partial name + tap suggestion)
- **Measured by**: Number of one-off items added via suggestion vs via MetadataBottomSheet
- **Baseline**: 0% of one-offs are added via suggestion today (feature does not exist)

### Technical Notes

- `handleSelectSuggestion` in HomeView currently assumes all suggestions are staples (`itemType: 'staple'`). Must check `StapleItem.type` and set `itemType` accordingly.
- Existing duplicate check in `handleSelectSuggestion` uses `(name, houseArea)` -- for one-offs with `houseArea: ''`, the check needs to also match by `itemType` or by `stapleId` to correctly detect duplicates.
- `StapleLibrary.search()` already returns all items from storage -- no domain change needed if storage returns one-offs too.
- Depends on US-01 (one-offs must be in library to appear in search).

---

## US-03: Differentiate One-Off Suggestions from Staple Suggestions

### Problem

Elena Ruiz has both "Butter" as a staple (Dairy, aisle 2) and "Butter" as a one-off (International, aisle 7 -- a specialty European butter). When she types "Butter" in QuickAdd, she sees two suggestions but cannot tell which is the staple and which is the one-off. Tapping the wrong one adds the item with the wrong type.

### Who

- Shopper with overlapping item names | Searching in QuickAdd | Needs to distinguish staple from one-off

### Solution

One-off suggestions in QuickAdd display a visual indicator (e.g., "(one-off)" label) to differentiate from staple suggestions.

### Domain Examples

#### 1: Happy Path -- Elena sees differentiated butter suggestions

Elena types "Butter". She sees: "Butter - Dairy / Aisle 2" (no label, it's a staple) and "Butter - International / Aisle 7 (one-off)". She can tell them apart at a glance.

#### 2: No collision -- only one type exists

Elena types "Tahini". Only one suggestion appears: "Tahini - International / Aisle 7 (one-off)". The "(one-off)" label is still shown for clarity.

#### 3: All staples -- no labels needed

Elena types "Milk". Only staple results appear: "Milk - Dairy / Aisle 3". No "(one-off)" label shown.

### UAT Scenarios (BDD)

#### Scenario: One-off suggestion shows type label

Given Elena has "Tahini" as a one-off in the item library
When Elena types "Tah" in QuickAdd
Then the suggestion for "Tahini" includes a "(one-off)" indicator

#### Scenario: Staple suggestion does not show type label

Given Elena has "Milk" as a staple in the item library
When Elena types "Mil" in QuickAdd
Then the suggestion for "Milk" does not include a type label

#### Scenario: Same-name items distinguished by type label

Given Elena has "Butter" as a staple in Dairy and "Butter" as a one-off in International
When Elena types "Butter" in QuickAdd
Then two suggestions appear
And the staple suggestion shows "Butter - Dairy / Aisle 2"
And the one-off suggestion shows "Butter - International / Aisle 7 (one-off)"

### Acceptance Criteria

- [ ] One-off suggestions display "(one-off)" label in QuickAdd suggestion list
- [ ] Staple suggestions do not display a type label
- [ ] Both types are visually scannable and distinguishable

### Outcome KPIs

- **Who**: Shoppers with both staple and one-off items with similar names
- **Does what**: Select the correct item type from suggestions on the first tap
- **By how much**: Mis-selection rate below 5% (qualitative -- users report selecting the wrong type)
- **Measured by**: Qualitative user feedback
- **Baseline**: N/A (feature does not exist)

### Technical Notes

- `formatSuggestion` in `QuickAdd.tsx` currently shows `${name} - ${section} / Aisle ${aisleNumber}`. Extend to append ` (one-off)` when `staple.type === 'one-off'`.
- This is a pure UI formatting change, no domain logic needed.
- Depends on US-01 (one-offs in library) and US-02 (one-offs in suggestions).

---

## US-04: Exclude Persisted One-Offs from Staple Checklist and Trip Preloading

### Problem

Elena Ruiz uses the staple checklist during her house sweep to mark which staples she needs. If persisted one-offs appear in the checklist, they will clutter the sweep workflow and confuse her -- one-offs like "Birthday Candles" have no house area and should not be part of the sweep. Similarly, one-offs should not be preloaded into new trips (only staples are preloaded).

### Who

- Weekly shopper | Using the staple checklist during sweep | Expects only staples in the checklist, not one-offs

### Solution

Filter persisted one-offs (`type: 'one-off'`) out of the staple checklist view and out of the trip preloading logic.

### Domain Examples

#### 1: Happy Path -- Checklist shows only staples

Elena has 15 staples and 3 persisted one-offs in her library. She opens the checklist. She sees 15 items (all staples). The 3 one-offs do not appear.

#### 2: New trip preloading -- only staples preloaded

Elena starts a new trip. The app preloads all staples into the trip with `needed: false`. The 3 one-offs are not preloaded. Elena's trip starts with 15 staple items, not 18.

#### 3: Edge Case -- Library has only one-offs

Elena has no staples (unlikely but possible) and 2 one-offs. The checklist shows an empty state. A new trip starts with zero preloaded items.

### UAT Scenarios (BDD)

#### Scenario: Staple checklist excludes one-off items

Given Elena has staples "Milk", "Bread", "Eggs" in the library
And Elena has one-offs "Tahini", "Birthday Candles" in the library
When Elena views the staple checklist
Then "Milk", "Bread", "Eggs" appear in the checklist
And "Tahini" and "Birthday Candles" do not appear

#### Scenario: New trip preloads only staples

Given Elena has staples "Milk", "Bread" in the library
And Elena has one-off "Tahini" in the library
When a new trip is created
Then "Milk" and "Bread" are preloaded into the trip as staples
And "Tahini" is not preloaded

#### Scenario: Empty checklist when only one-offs exist

Given Elena has only one-off items in her library (no staples)
When Elena views the staple checklist
Then the checklist is empty

### Acceptance Criteria

- [ ] Staple checklist displays only items with `type: 'staple'`
- [ ] Trip preloading includes only items with `type: 'staple'`
- [ ] One-offs are not visible in checklist view
- [ ] One-offs are not preloaded into new trips

### Outcome KPIs

- **Who**: Weekly shoppers using the sweep workflow
- **Does what**: Complete the house sweep without being confused by one-off items in the checklist
- **By how much**: Zero one-off items appear in sweep-related views
- **Measured by**: Checklist item count matches staple count (excludes one-offs)
- **Baseline**: Not applicable (one-offs not in library today)

### Technical Notes

- `HomeView` passes `allStaples` (from `stapleLibrary.listAll()`) to `StapleChecklist`. Add filter: `.filter(s => s.type === 'staple')`.
- Trip preloading logic (likely in trip initialization) iterates over `stapleLibrary.listAll()`. Add same filter.
- This is a filtering concern, not a storage concern. The library stores both types; consumers filter.
- Depends on US-01 (one-offs exist in library).
