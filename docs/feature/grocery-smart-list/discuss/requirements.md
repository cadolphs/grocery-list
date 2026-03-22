# Requirements: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Business Context

Carlos Rivera spends 20 minutes every bi-weekly shopping trip consolidating a physical whiteboard and Notion database into a usable shopping list. He describes the planning process with the word "dread." His wife Elena uses the whiteboard for mid-week additions. Existing tools (Notion, Workflowy, generic grocery apps) fail to support the dual-view need: organizing items by house area at home and by store aisle when shopping.

## Desired Outcome

Reduce grocery trip prep from 20 minutes to under 5 minutes. Eliminate the consolidation step. Provide reliable offline shopping with automatic trip carryover.

---

## Functional Requirements

### FR1: Item Management

Items have the following properties:
- Name (required)
- House area: one of Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer (required)
- Store section: named section like Dairy, Deli, Produce, Baking, etc. (required)
- Aisle number: numeric, optional (some sections like Deli have no aisle)
- Type: Staple (recurring, auto-repopulates) or One-off (this trip only)

Staple items persist in a library across trips. One-off items exist only for the current trip (cleared after purchase, carried over if not purchased).

### FR2: Home View (Organized by House Area)

- Display items grouped by house area
- Pre-load all staples from the library at the start of each sweep
- Support adding new items (staple or one-off) per area
- Support unchecking a staple to skip it this trip without removing from library
- Track sweep progress across areas
- Support consolidation from whiteboard as an explicit step

### FR3: Store View (Organized by Aisle/Section)

- Display the same items grouped by aisle/section in store walk order
- Numbered aisles appear in ascending order; named sections appear after aisles
- Only sections with items on the current trip are shown (empty aisles excluded)
- Check-off marks items as "in cart"
- Check-off persists to local storage immediately (offline-first)
- Section navigation shows progress and next section

### FR4: View Toggle

- Manual toggle between home view and store view
- Same underlying data, different grouping
- Check-off state and item list are identical in both views
- No automatic switching (user controls when to switch)

### FR5: Trip Lifecycle

- Trip starts when user begins a sweep
- Trip ends when user taps "Finish Trip" in store view
- On trip completion:
  - Purchased staples: re-queue for next trip (auto-populate)
  - Purchased one-offs: clear permanently
  - Unbought staples: carry over to next trip
  - Unbought one-offs: carry over to next trip
- No immediate reset needed (1-2 weeks between trips)

### FR6: Quick-Add with Suggestions

- Type-ahead suggestions from staple library
- Known staples auto-fill metadata (area, aisle, section)
- Unknown items prompt for metadata assignment
- Option to add as staple or one-off

---

## Non-Functional Requirements

### NFR1: Offline-First

- All features must work without network connectivity
- Check-off state persists to local storage within 500ms
- Full trip state (items, check-offs, progress) survives app restart
- Sync to cloud when network available (no data conflicts)

### NFR2: Performance

- View toggle between home and store completes in under 200ms
- Check-off visual feedback within 100ms
- Quick-add suggestions appear within 300ms of typing
- App launch to sweep-ready state in under 2 seconds

### NFR3: Data Integrity

- No duplicate items on a trip
- Staple library is never modified by trip completion (staples are never accidentally deleted)
- Carryover items appear exactly once on the next trip
- Aisle metadata is persistent and consistent across views

---

## Business Rules

### BR1: Staple Lifecycle
- Staples auto-populate on every new trip
- Purchasing a staple does not remove it from the library
- Unchecking a staple during sweep removes it from THIS trip only
- Staples can only be permanently removed via explicit library management

### BR2: One-Off Lifecycle
- One-offs exist for the current trip only
- Purchasing a one-off clears it permanently after trip completion
- Not purchasing a one-off carries it to the next trip
- One-offs do not enter the staple library unless explicitly promoted

### BR3: House Areas
- Fixed list: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer
- Every item must belong to exactly one house area
- Areas cannot be added or removed by the user (initial scope)

### BR4: Store Sections
- Items have a section name (e.g., Dairy, Deli, Produce) and optional aisle number
- Aisle number drives the sort order in store view
- Sections without aisle numbers appear after numbered aisles
- Section metadata is a property of the item, persisted across trips

---

## Domain Glossary

| Term | Definition |
|------|-----------|
| Staple | An item that recurs every trip. Auto-populates on the shopping list each cycle. Has persistent metadata. |
| One-off | An item needed for this trip only. Cleared after purchase. Carried over if not purchased. |
| House area | A physical location in the home (Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer). Used to organize the home view. |
| Store section | A named area in the store (Dairy, Deli, Produce, etc.). May have an aisle number. Used to organize the store view. |
| Sweep | The bi-weekly physical walk-through of the house, room by room, to identify needed items. |
| Trip | A single shopping trip cycle: starts with sweep, ends with store checkout and carryover. |
| Carryover | Unbought items from one trip that automatically appear on the next trip. |
| Home view | The shopping list organized by house area. Used during the sweep. |
| Store view | The shopping list organized by aisle/section. Used during shopping. |
| Quick-add | The fast item entry interface with type-ahead suggestions from the staple library. |
