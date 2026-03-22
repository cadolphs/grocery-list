# Walking Skeleton Definition: grocery-list-ui

## Purpose

The UI walking skeleton proves that React Native components can render domain data and that user interactions trigger correct domain operations, all wired through ServiceProvider with null adapters.

## Skeleton Scenarios (6 total)

### UI-WS-1: Home view shows staples organized by house area
- **User goal**: See all my trip items organized by where they are in my house
- **Proves**: ServiceProvider -> useTrip -> HomeView -> AreaSection -> TripItemRow rendering chain works
- **Demo-able**: Stakeholder sees items grouped under Fridge, Bathroom, Garage Pantry headings

### UI-WS-2: Quick-add places a new item on the trip
- **User goal**: Add an item I just noticed is needed
- **Proves**: QuickAdd component -> useTrip.addItem -> re-render with new item
- **Demo-able**: Type a name, submit, see it appear in the list

### UI-WS-3: Toggle switches from home view to store view
- **User goal**: Switch to my shopping-optimized view when I arrive at the store
- **Proves**: ViewToggle -> useViewMode -> conditional rendering of HomeView/StoreView
- **Demo-able**: Tap "Store", home view disappears, store view appears

### UI-WS-4: Store view shows items organized by aisle and section
- **User goal**: See items grouped by store aisle so I shop efficiently
- **Proves**: StoreView -> AisleSection rendering with groupByAisle data
- **Demo-able**: Aisle headings with item names underneath, numbered aisles first

### UI-WS-5: Tapping an item in store view marks it as in the cart
- **User goal**: Check off items as I put them in my cart
- **Proves**: TripItemRow tap -> useTrip.checkOff -> visual checked state
- **Demo-able**: Tap milk, see it marked as checked

### UI-WS-6: Completing the trip shows a summary with carryover
- **User goal**: Finish shopping and see what I got and what carries over
- **Proves**: Finish Trip -> completeTrip -> TripSummaryView rendering
- **Demo-able**: Summary screen with purchased count and carryover items listed

## Implementation Sequence

Enable one test at a time in this order:
1. UI-WS-1 (requires: ServiceProvider, AppShell, HomeView, AreaSection, TripItemRow)
2. UI-WS-2 (requires: QuickAdd component)
3. UI-WS-3 (requires: ViewToggle, useViewMode)
4. UI-WS-4 (requires: StoreView, AisleSection)
5. UI-WS-5 (requires: TripItemRow tap handler with useTrip.checkOff)
6. UI-WS-6 (requires: TripSummaryView, Finish Trip flow)

## Litmus Test Results

Each skeleton scenario:
1. Title describes a user goal (not a technical flow)
2. Given/When describe user actions (open screen, tap, type)
3. Then describe user observations (sees items, sees heading, sees checkmark)
4. A non-technical stakeholder can confirm "yes, that is what users need"
