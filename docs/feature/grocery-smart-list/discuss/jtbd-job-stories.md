# JTBD Job Stories: Grocery Smart List

**Feature ID**: grocery-smart-list
**Phase**: DISCUSS -- Phase 1 (JTBD Analysis)
**Date**: 2026-03-17

---

## Job Classification

**Job Type**: Build Something New (Greenfield)
**Primary Job**: When I need to restock the household, I want to efficiently identify what is needed and shop without friction, so I can spend less time and mental energy on grocery management.

---

## JS1: Home Sweep Capture

**When** I am doing my bi-weekly walk-through of the house checking what needs restocking,
**I want to** quickly record missing items room by room as I physically move through each area,
**so I can** capture everything in under 5 minutes without breaking the flow of the sweep.

### Functional Job
Record needed items organized by house area (bathroom, garage pantry, kitchen cabinets, fridge, freezer) during a physical walk-through.

### Emotional Job
Feel efficient and in control during the sweep -- no dread, no tedious transcription afterward.

### Social Job
Be seen by household as the person who keeps the pantry stocked without making it a big production.

### Forces Analysis
- **Push**: 20-minute consolidation from whiteboard to Notion is tedious and dreaded
- **Pull**: Room-by-room digital capture eliminates the consolidation step entirely
- **Anxiety**: Will adding items in the app be as fast as scribbling on the whiteboard?
- **Habit**: Physical walk-through ritual is ingrained; whiteboard is zero-friction capture

---

## JS2: Whiteboard Consolidation

**When** I am preparing for a shopping trip and my wife has added items to the physical whiteboard during the week,
**I want to** quickly transfer those whiteboard items into my shopping list with minimal effort,
**so I can** have a complete list without spending time reorganizing or re-entering data.

### Functional Job
Consolidate items from the shared physical whiteboard into the digital shopping list, assigning them to correct house areas and store sections.

### Emotional Job
Feel confident the list is complete -- nothing from the whiteboard was missed.

### Social Job
Respect wife's preferred input method (whiteboard) while maintaining own system.

### Forces Analysis
- **Push**: Manual transcription from whiteboard to Notion takes too long and is error-prone
- **Pull**: Quick manual entry that auto-assigns metadata (aisle, section) for known staples
- **Anxiety**: What if the app is slower than just copying to Notion?
- **Habit**: Wife prefers the whiteboard; the app must coexist, not replace it

---

## JS3: Staple Item Management

**When** I buy the same items every trip (milk, eggs, bread, toilet paper) and they always come from the same aisle,
**I want to** have those items automatically appear on my list without re-entering them each cycle,
**so I can** focus only on what is different this trip rather than rebuilding the list from scratch.

### Functional Job
Maintain a library of staple items with persistent metadata (house area, store aisle/section) that auto-populate onto the shopping list each cycle.

### Emotional Job
Feel that the system works for me, not the other way around -- the list should be mostly ready before I even start.

### Social Job
N/A (internal household task).

### Forces Analysis
- **Push**: No staple/one-off distinction in Notion; user "just suffers" through manual rebuilding
- **Pull**: Staples auto-repopulate; only exceptions need attention
- **Anxiety**: What if a staple is added that I do not actually need this trip? Can I skip it easily?
- **Habit**: Currently rebuilds list manually from memory each trip

---

## JS4: Store Navigation

**When** I arrive at the store and switch to shopping mode,
**I want to** see my list reorganized by aisle and section in the order I walk the store,
**so I can** move through the store efficiently without backtracking or missing items.

### Functional Job
Display the shopping list grouped by store aisle/section in physical walk order, allowing check-off as items are placed in the cart.

### Emotional Job
Feel focused and efficient in-store -- no fumbling, no confusion, no anxiety about missing something.

### Social Job
N/A (solo shopping task).

### Forces Analysis
- **Push**: Notion's store view is fragile, hard to maintain, and fails offline
- **Pull**: Aisle-ordered list that works offline, with check-off that never loses state
- **Anxiety**: Will the aisle data be accurate? What about non-aisle sections like the deli?
- **Habit**: Currently uses Notion grouped by section/aisle; the pattern is familiar

---

## JS5: In-Store Check-Off

**When** I am standing in an aisle scanning my list for everything I need from this section,
**I want to** reliably check off items as I put them in the cart, even with no network,
**so I can** trust that my list state is accurate and move confidently to the next section.

### Functional Job
Check off items in the current aisle/section. Checked items persist locally regardless of network state. Empty aisles are skipped automatically.

### Emotional Job
Feel confident that checked items stay checked -- no re-checking, no lost state, no frustration.

### Social Job
N/A.

### Forces Analysis
- **Push**: Notion check-offs fail on unreliable store Wi-Fi; reloading loses state
- **Pull**: Offline-first means check-offs always persist; zero failures
- **Anxiety**: What if offline changes conflict when I get back online?
- **Habit**: Accustomed to checking items in Notion (when it works)

---

## JS6: Trip Completion and Carryover

**When** I finish shopping and some items were not available or I decided to skip them,
**I want to** have unbought items automatically carry over to the next trip,
**so I can** not worry about manually tracking what I still need.

### Functional Job
When a trip ends, migrate unchecked items to the next trip's list. Clear checked one-off items. Re-queue checked staples for the next cycle.

### Emotional Job
Feel that the system remembers for me -- nothing slips through the cracks between trips.

### Social Job
N/A.

### Forces Analysis
- **Push**: No carryover mechanism in Notion; must manually track skipped items
- **Pull**: Automatic migration means zero mental overhead between trips
- **Anxiety**: What if it carries over something I intentionally skipped forever?
- **Habit**: Currently just remembers skipped items mentally

---

## Job Story Dependency Map

```
JS1 (Home Sweep) -----> JS2 (Whiteboard Consolidation) -----> JS4 (Store Navigation)
                                                                      |
JS3 (Staple Management) ------> [feeds into JS1 and JS4]            |
                                                                      v
                                                               JS5 (In-Store Check-Off)
                                                                      |
                                                                      v
                                                               JS6 (Trip Completion)
```

## Traceability to Pain Points

| Job Story | Pain Points Addressed |
|-----------|----------------------|
| JS1: Home Sweep Capture | PP1 (prep friction), PP3 (adding items painful) |
| JS2: Whiteboard Consolidation | PP1 (prep friction), PP6 (multi-user input) |
| JS3: Staple Item Management | PP2 (no staple distinction), PP4 (store metadata) |
| JS4: Store Navigation | PP4 (store metadata), PP5 (offline reliability) |
| JS5: In-Store Check-Off | PP5 (offline reliability) |
| JS6: Trip Completion | PP2 (no staple distinction) |
