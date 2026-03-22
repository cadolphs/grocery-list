# Shared Artifacts Registry: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Registry

### staple_library

- **Source of truth**: Persistent item database (local storage, synced to cloud)
- **Consumers**:
  - Home sweep: pre-loaded items per area (Step 1, 2)
  - Quick-add: type-ahead suggestions (Step 3, 5)
  - Store view: items grouped by aisle/section (Store Step 1, 2)
  - Trip completion: staple re-queue logic (Store Step 6)
- **Owner**: Item management feature
- **Integration risk**: HIGH -- staple library is the backbone of both journeys. If items are missing or metadata is stale, both views break.
- **Validation**: After any item add/edit, verify item appears correctly in both home-area and store-aisle views with matching metadata.

### house_areas

- **Source of truth**: App configuration (fixed list: Bathroom, Garage Pantry, Kitchen Cabinets, Fridge, Freezer)
- **Consumers**:
  - Home sweep: area checklist (Step 1)
  - Area detail: area header (Step 2)
  - Sweep progress: completion tracking (Step 4)
  - Trip review: area breakdown (Step 6)
- **Owner**: App configuration
- **Integration risk**: LOW -- fixed list, changes infrequently
- **Validation**: All 5 areas appear in sweep. No area is missing or duplicated.

### item_aisle_metadata

- **Source of truth**: Per-item property in staple_library (aisle number and section name)
- **Consumers**:
  - Home sweep area detail: aisle shown next to item (Home Step 2)
  - Quick-add suggestions: aisle shown in suggestion (Home Step 3, 5)
  - Store view: items grouped by aisle/section (Store Step 1, 2)
- **Owner**: Item management feature
- **Integration risk**: HIGH -- aisle metadata drives the store view. If metadata is wrong, items appear in the wrong section.
- **Validation**: Aisle shown in home view area detail must match the section grouping in store view for the same item.

### trip_items

- **Source of truth**: Current trip item list (built during home sweep, consumed during store shop)
- **Consumers**:
  - Home sweep: items added per area (Home Steps 2-5)
  - Trip review: total count and breakdown (Home Step 6)
  - Store view: items grouped by section (Store Step 1, 2)
  - Check-off: items available for checking (Store Step 3)
  - Trip completion: bought/not-bought summary (Store Step 6)
- **Owner**: Trip management feature
- **Integration risk**: HIGH -- this is the primary data artifact flowing between both journeys. Any inconsistency means items are lost or duplicated.
- **Validation**: Item count in trip review (Home Step 6) must equal item count in store view (Store Step 1). Every item from the home sweep must appear in store view.

### check_off_state

- **Source of truth**: Local storage (offline-first, per-item boolean)
- **Consumers**:
  - Section detail: item checked/unchecked display (Store Step 3)
  - Section progress: counter per section (Store Steps 2-5)
  - Trip completion: bought vs not-bought summary (Store Step 6)
  - Next trip: carryover logic for unbought items (Store Step 6)
- **Owner**: Trip management feature
- **Integration risk**: HIGH -- check-off state drives trip completion and carryover. If state is lost (offline failure), the entire in-store experience breaks.
- **Validation**: Check-off state survives app backgrounding, restart, and offline periods. Total checked count matches trip completion summary.

### sweep_progress

- **Source of truth**: Area completion state (per-area boolean + item count)
- **Consumers**:
  - Sweep progress screen: completed/remaining areas (Home Step 4)
  - Trip review: items-per-area breakdown (Home Step 6)
- **Owner**: Home sweep feature
- **Integration risk**: MEDIUM -- drives sweep flow but does not cross to store journey
- **Validation**: Completed area count plus remaining area count equals 5. Item counts per area sum to total trip items.

### trip_result

- **Source of truth**: Aggregated check-off state at trip completion
- **Consumers**:
  - Trip completion screen: summary display (Store Step 6)
  - Next trip: carryover items pre-loaded (Home Step 1 of next cycle)
  - Staple library: re-queue trigger (Home Step 1 of next cycle)
- **Owner**: Trip management feature
- **Integration risk**: HIGH -- drives the transition between trips. If carryover fails, items are lost.
- **Validation**: Unbought items from trip N appear on trip N+1. Purchased staples re-appear on trip N+1. Purchased one-offs do not appear on trip N+1.

---

## Integration Checkpoints

### Checkpoint 1: Home-to-Store Transition

**When**: User switches from home view to store view
**Validate**:
- Total item count matches between home trip review and store section list
- Every item from home sweep appears in exactly one store section
- Items with aisle metadata appear under the correct aisle
- Items without aisle number appear under their named section (e.g., Deli)

### Checkpoint 2: Offline Persistence

**When**: Any state change while offline
**Validate**:
- All check-offs persist to local storage within 500ms
- App restart preserves all state (trip items, check-offs, sweep progress)
- No data loss after extended offline periods (full shopping trip duration)

### Checkpoint 3: Trip Boundary

**When**: User completes a trip
**Validate**:
- Purchased staples re-queue for next trip with all metadata intact
- Purchased one-offs are cleared permanently
- Unbought items (staple or one-off) carry over to next trip
- No duplicate items on next trip
- Staple library is not modified by trip completion (staples are never deleted by completing a trip)

### Checkpoint 4: Staple Library Consistency

**When**: Any staple is added, edited, or displayed
**Validate**:
- Staple appears in correct house area (home view) AND correct aisle/section (store view)
- Metadata (name, house area, aisle, section, staple/one-off type) is identical across all consumers
- Changes to a staple's metadata propagate to both views immediately
