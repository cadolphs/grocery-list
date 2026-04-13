<!-- markdownlint-disable MD024 -->

# User Stories: Checklist Search Bar

## System Constraints

- React Native / Expo SDK 54 -- TextInput must work on Android + Web
- Functional paradigm: no classes, factory functions and hooks only
- StapleChecklist is currently a pure presentational component (no hooks) -- search state can be managed either inside it or lifted to HomeView
- Filtering is UI-only; no domain or adapter changes needed
- Accessibility: minimum touch target 48px (already enforced in existing rows)

---

## US-01: Filter Checklist Staples by Name

### Problem

Clemens is the sole user of Grocery Smart List. He has 60+ staples in his library. When he opens the checklist to add items to his trip, he has to scroll through the entire alphabetical list to find a specific staple. This wastes 10-15 seconds per item when the list is long, and it is easy to accidentally miss or tap the wrong item.

### Who

- Clemens | Checklist mode, planning a trip | Wants to quickly find and toggle a known staple

### Solution

A search bar at the top of the checklist that filters the displayed staples in real-time as the user types. The filter matches by staple name (case-insensitive, substring match). Toggling and long-press editing continue to work on the filtered list. A clear button resets the filter and restores the full list.

### Domain Examples

#### 1: Happy Path -- Find Cheddar Cheese in a long list

Clemens has 65 staples. He wants to add Cheddar Cheese to his trip. He opens the checklist, types "ched" in the search bar, and sees only "Cheddar Cheese". He taps it -- it turns green. He taps the X to clear the search and continues browsing.

#### 2: Multiple Matches -- Search for "ch"

Clemens types "ch" and sees Cheddar Cheese, Chicken Breast, and Chocolate Chips. He taps Chicken Breast (adds to trip) and Chocolate Chips (adds to trip). Both turn green. Cheddar Cheese remains gray with strikethrough since he did not tap it.

#### 3: Case Insensitive -- Lowercase query matches capitalized name

Clemens types "butter" (all lowercase) and sees "Butter" and "Peanut Butter" in the results. The match is case-insensitive and works as a substring.

#### 4: Clear Search Restores Full List

Clemens has "ch" in the search bar and sees 3 items. He taps the X clear button. The search bar empties and all 65 staples reappear in alphabetical order with their current checked/unchecked state preserved.

#### 5: Toggle Off from Filtered View

Clemens searches for "milk". He sees "Milk" which is green (already on trip). He taps it -- it turns gray with strikethrough (removed from trip). The item stays visible in the filtered results so he can confirm the change.

### UAT Scenarios (BDD)

#### Scenario: Find a specific staple by typing part of its name

Given Clemens has 65 staples including "Cheddar Cheese", "Chicken Breast", "Chocolate Chips", and "Butter"
When he opens the checklist and types "ched" in the search bar
Then only "Cheddar Cheese" is displayed in the list

#### Scenario: Multiple staples match the search query

Given Clemens has staples "Cheddar Cheese", "Chicken Breast", "Chocolate Chips", and "Butter"
When he types "ch" in the search bar
Then "Cheddar Cheese", "Chicken Breast", and "Chocolate Chips" are displayed
And "Butter" is not displayed

#### Scenario: Search is case-insensitive

Given Clemens has a staple named "Peanut Butter"
When he types "peanut" in the search bar
Then "Peanut Butter" appears in the filtered list

#### Scenario: Toggle staple onto trip from filtered results

Given Clemens has filtered the checklist by typing "ched"
And "Cheddar Cheese" is not on the current trip
When he taps "Cheddar Cheese"
Then "Cheddar Cheese" is added to the trip
And it appears with green text in the filtered view

#### Scenario: Clear search restores the full staple list

Given Clemens has typed "ch" and sees 3 filtered staples
When he taps the clear button on the search bar
Then the search input is empty
And all 65 staples are displayed alphabetically

### Acceptance Criteria

- [ ] A search input is visible at the top of the checklist when in checklist mode
- [ ] Typing in the search input filters the staple list in real-time by name (case-insensitive substring match)
- [ ] Filtered results preserve checked/unchecked visual state (green vs gray strikethrough)
- [ ] Tapping a staple in filtered results toggles it on/off the trip (existing behavior preserved)
- [ ] Long-pressing a staple in filtered results opens the edit sheet (existing behavior preserved)
- [ ] A clear button (X) appears when the search input has text, and clears the filter when tapped

### Outcome KPIs

- **Who**: Clemens (sole user)
- **Does what**: Finds and toggles a specific staple without scrolling
- **By how much**: Time to find and toggle a staple drops from ~12 seconds (scrolling) to ~4 seconds (type + tap)
- **Measured by**: Observational timing during trip planning session
- **Baseline**: Currently scrolls through 60+ items alphabetically

### Technical Notes

- Filtering can be done via `Array.filter()` on the already-sorted staples array
- Search state is local to the checklist view -- no persistence needed
- Consider debouncing only if performance is an issue (unlikely with <100 items)
- `TextInput` from React Native with `clearButtonMode` on iOS; custom X button for cross-platform
- No domain layer changes; no new ports or adapters

---

## US-02: Empty State Message When No Staples Match Search

### Problem

Clemens types a search query that matches no staples (e.g., a typo like "chedr" instead of "ched"). He sees an empty list with no explanation. He is unsure whether the search is broken, whether he has no staples, or whether he just misspelled the query. A brief moment of confusion that a simple message would prevent.

### Who

- Clemens | Checklist mode, searching | Typed a query with no matches (likely a typo)

### Solution

When the search filter produces zero results, display a message below the empty list area: "No staples match '{query}'". This confirms the search is working and the query is the issue, guiding the user to correct it.

### Domain Examples

#### 1: Typo produces no matches

Clemens types "chedr" (misspelling of "cheddar"). No staples match. He sees "No staples match 'chedr'" and realizes the typo. He corrects to "ched" and sees Cheddar Cheese.

#### 2: Completely unrecognized query

Clemens types "sushi" but has no sushi-related staples. He sees "No staples match 'sushi'" and understands he needs to add it as a new staple via Quick Add instead.

#### 3: Single character with no matches

Clemens types "z". No staples start with or contain "z". He sees "No staples match 'z'" and clears the search.

### UAT Scenarios (BDD)

#### Scenario: Empty state message shown when no staples match

Given Clemens has 60 staples and none contain "zzz" in their name
When he types "zzz" in the search bar
Then the staple list is empty
And the message "No staples match 'zzz'" is displayed

#### Scenario: Empty state disappears when query is corrected

Given Clemens has typed "chedr" and sees "No staples match 'chedr'"
When he corrects the query to "ched"
Then "Cheddar Cheese" appears in the list
And the "No staples match" message is no longer visible

#### Scenario: Empty state disappears when search is cleared

Given Clemens sees "No staples match 'zzz'"
When he taps the clear button
Then all staples are displayed
And the "No staples match" message is no longer visible

### Acceptance Criteria

- [ ] When the search filter produces zero results, the message "No staples match '{query}'" is displayed
- [ ] The message uses the actual query text typed by the user
- [ ] The message disappears when the query is modified to produce results
- [ ] The message disappears when the search is cleared

### Outcome KPIs

- **Who**: Clemens (sole user)
- **Does what**: Recognizes a search miss and corrects it (instead of being confused)
- **By how much**: Zero-result confusion eliminated -- user immediately understands why list is empty
- **Measured by**: Observational -- user corrects query or clears search within 3 seconds of seeing message
- **Baseline**: Currently would see a blank area with no explanation

### Technical Notes

- Simple conditional render: if `filteredStaples.length === 0 && searchQuery.length > 0`, show message
- No domain or adapter changes
- Depends on US-01 (search bar must exist first)
