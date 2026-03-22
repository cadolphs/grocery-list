# Data Models: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17

---

## Domain Types

These are the conceptual data models that the domain layer operates on. The software-crafter will define the exact TypeScript types during implementation.

---

### House Area (Enum/Union)

Fixed set of 5 values:
- Bathroom
- Garage Pantry
- Kitchen Cabinets
- Fridge
- Freezer

Not user-configurable in initial scope.

---

### Store Location

Describes where an item is found in the store.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| section | string | Yes | Named store section (e.g., "Dairy", "Deli", "Produce", "Baking") |
| aisleNumber | number or null | No | Numeric aisle. Null for sections without aisles (e.g., Deli). Drives sort order in store view. |

---

### Item Type (Enum/Union)

- **staple** -- Recurring item that auto-populates every trip
- **one-off** -- Single-trip item, cleared after purchase or carried over if unbought

---

### Staple Item

A persistent item in the staple library. Exists across trips.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| name | string | Yes | Item name (e.g., "Whole milk") |
| houseArea | HouseArea | Yes | Where in the house this item belongs |
| storeLocation | StoreLocation | Yes | Where in the store this item is found |
| type | "staple" | Yes | Always "staple" for library items |
| createdAt | timestamp | Yes | When the staple was added to the library |

**Uniqueness constraint**: No two staples with the same `name` in the same `houseArea`.

---

### Trip

Represents a single shopping trip cycle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier |
| status | "active" or "completed" | Yes | Trip lifecycle state |
| startedAt | timestamp | Yes | When the sweep began (for prep time calculation) |
| completedAt | timestamp or null | No | When "Finish Trip" was tapped |
| items | TripItem[] | Yes | All items on this trip |

---

### Trip Item

An item on a specific trip. Links to a staple (if applicable) or stands alone (one-off).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier for this trip-item instance |
| name | string | Yes | Item name |
| houseArea | HouseArea | Yes | House area assignment |
| storeLocation | StoreLocation | Yes | Store location assignment |
| itemType | "staple" or "one-off" | Yes | Whether this is a recurring or single-trip item |
| stapleId | string or null | No | Reference to staple library item (null for one-offs) |
| source | "preloaded" or "quick-add" or "whiteboard" | Yes | How this item was added to the trip |
| needed | boolean | Yes | Whether this item is needed this trip (false = skipped) |
| checked | boolean | Yes | Whether this item has been checked off (in cart) |
| checkedAt | timestamp or null | No | When the item was checked off |

---

### Trip Completion Result

Output of the trip completion operation. Not persisted directly -- it drives the transition to the next trip.

| Field | Type | Description |
|-------|------|-------------|
| purchasedStaples | TripItem[] | Staples that were bought (re-queue via library) |
| purchasedOneOffs | TripItem[] | One-offs that were bought (clear permanently) |
| unboughtItems | TripItem[] | Items not bought (carry over to next trip) |
| skippedItems | TripItem[] | Items that were marked as not needed (do not carry over) |
| totalPurchased | number | Count of purchased items |
| totalCarriedOver | number | Count of items carrying to next trip |

---

### Grouped Items (View Model)

Output of the item grouping functions. Used by UI to render grouped lists.

**Home View Grouping**:

| Field | Type | Description |
|-------|------|-------------|
| area | HouseArea | The house area |
| items | TripItem[] | Items in this area |
| totalCount | number | Total items in area |
| neededCount | number | Items marked as needed |

All 5 areas always present (even if empty).

**Store View Grouping**:

| Field | Type | Description |
|-------|------|-------------|
| section | string | Store section name |
| aisleNumber | number or null | Aisle number (null for non-numbered sections) |
| items | TripItem[] | Items in this section |
| checkedCount | number | Items checked off |
| totalCount | number | Total items in section |

Only sections with items are included. Sorted by aisle number ascending, then named sections without aisles.

---

## Storage Schema

### AsyncStorage Keys

| Key | Value Type | Description |
|-----|-----------|-------------|
| `staple_library` | JSON (StapleItem[]) | Complete staple library |
| `active_trip` | JSON (Trip) | Active trip state including all trip items |
| `schema_version` | string | Data schema version for migration support |

### Schema Versioning

Storage values include a version field to support future migrations:
- Version "1": Initial schema as defined above
- Adapter is responsible for detecting version and migrating on load

---

## Carryover Logic (Domain Rules)

On trip completion, the next trip's item list is determined by:

1. **All staples from the library** are pre-loaded (regardless of whether they were bought, skipped, or carried over on the previous trip)
2. **Unbought one-offs** carry over as trip items with `source: "preloaded"` and `needed: true`
3. **Bought one-offs** are discarded (not carried over)
4. **Skipped staples** (needed = false) do NOT carry over as skipped -- they return to `needed: true` on the next trip because they are re-populated from the library

This means the next trip always starts with: (all staples, needed=true) + (unbought one-offs from previous trip, needed=true). No duplicate items.

---

## Data Size Estimates

| Data | Estimated Max Size | Storage Impact |
|------|-------------------|---------------|
| Staple library | ~50-100 items | ~10-20 KB JSON |
| Active trip | ~30-50 items | ~5-10 KB JSON |
| Total AsyncStorage usage | | < 50 KB |

AsyncStorage is appropriate for this scale. No pagination or lazy loading needed.
