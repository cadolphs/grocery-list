# Walking Skeleton: Grocery Smart List

**Feature ID**: grocery-smart-list
**Wave**: DISTILL
**Date**: 2026-03-17

---

## Walking Skeleton Definition

The walking skeleton consists of 6 scenarios, one per backbone activity from the story map. Each traces a thin vertical slice that delivers observable user value end-to-end.

### Litmus Test (all pass)

| Test | WS-1 | WS-2 | WS-3 | WS-4 | WS-5 | WS-6 |
|------|------|------|------|------|------|------|
| Title describes user goal? | Yes: "Add a staple item" | Yes: "Staples pre-load by area" | Yes: "Quick-add item" | Yes: "Toggle home to store" | Yes: "Check off item" | Yes: "Complete trip with carryover" |
| Given/When are user actions? | Yes | Yes | Yes | Yes | Yes | Yes |
| Then is user observation? | Yes: item in library | Yes: items grouped by area | Yes: item on trip | Yes: items regrouped by aisle | Yes: item in cart | Yes: correct next trip |
| Stakeholder can confirm? | Yes | Yes | Yes | Yes | Yes | Yes |

---

## Walking Skeleton Scenarios

### WS-1: Carlos adds a staple item with full metadata
**Story**: US-01 (Add a Staple Item)
**Activity**: Manage Staples

Carlos adds "Whole milk" as a staple in the Fridge area, Dairy section, Aisle 3. The item is saved to the staple library and will auto-populate future trips.

**Driving port**: Staple Library Service (domain function)

### WS-2: Carlos sees pre-loaded staples grouped by house area
**Story**: US-02 (See Pre-Loaded Staples by Area)
**Activity**: Sweep Home

Carlos has 5 staples across 3 house areas. When he starts a new sweep, items appear grouped under Bathroom, Fridge, and Garage Pantry with correct counts. Empty areas are visible.

**Driving port**: Trip Service (start) + Item Grouping (groupByArea)

### WS-3: Carlos quick-adds a new item during a trip
**Story**: US-03 (Quick-Add Item)
**Activity**: Consolidate Whiteboard

Carlos quick-adds "Canned tomatoes" as a staple with full metadata. The item appears on the current trip and is saved to the staple library for future trips.

**Driving port**: Trip Service (addItem) + Staple Library Service (addStaple)

### WS-4: Carlos toggles from home view to store view
**Story**: US-04 (Toggle Between Home and Store Views)
**Activity**: Switch View

Carlos has items across multiple areas and aisles. When he switches to store view, items regroup by aisle number (ascending) then named sections. Only non-empty sections appear.

**Driving port**: Item Grouping (groupByAisle) -- pure function

### WS-5: Carlos checks off an item in the store
**Story**: US-05 (Check Off Items in Store)
**Activity**: Shop Store

Carlos checks off "Whole milk" in store view. The item shows as in the cart and the state is persisted to storage.

**Driving port**: Trip Service (checkOff) + Trip Storage Port

### WS-6: Carlos completes a trip with carryover rules applied
**Story**: US-06 (Complete Trip with Carryover)
**Activity**: Complete Trip

Carlos has bought a staple (milk) and a one-off (birthday candles), and left a one-off unbought (avocados). On trip completion: milk re-queues from library, candles are cleared, avocados carries over.

**Driving port**: Trip Service (complete) + completeTrip domain function

---

## Implementation Order

The walking skeleton tests are ordered to build incrementally:

1. **WS-1** establishes the staple library (foundation for everything else)
2. **WS-2** uses the staple library to populate a trip (depends on WS-1)
3. **WS-3** adds items during a trip (depends on trip existing from WS-2)
4. **WS-4** regroups trip items for store view (depends on items from WS-2/3)
5. **WS-5** checks off items in store (depends on store view from WS-4)
6. **WS-6** completes the trip lifecycle (depends on check-off from WS-5)

Each walking skeleton test, when passing, proves that Carlos can accomplish one more step of his grocery workflow. After all 6 pass, the complete journey from staple creation through trip completion is demo-able.

---

## Driving Ports Summary

| Skeleton | Driving Port | Type |
|----------|-------------|------|
| WS-1 | createStapleLibrary / addStaple | Domain function |
| WS-2 | createTrip / start + groupByArea | Domain function |
| WS-3 | trip.addItem + library.addStaple | Domain function |
| WS-4 | groupByAisle | Pure function |
| WS-5 | trip.checkOff | Domain function + storage port |
| WS-6 | completeTrip | Domain function |

All tests invoke through driving ports. Zero tests import internal components (validators, formatters, repositories).
