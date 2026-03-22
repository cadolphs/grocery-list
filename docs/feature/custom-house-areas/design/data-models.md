# Data Models: Custom House Areas

**Feature ID**: custom-house-areas
**Date**: 2026-03-20

---

## AreaStorage Schema

### AsyncStorage Key

`@grocery/house_areas`

### Data Shape

```
{
  "schema_version": 1,
  "areas": ["Bathroom", "Garage Pantry", "Kitchen Cabinets", "Fridge", "Freezer"]
}
```

- `schema_version`: Integer, starts at 1. Enables future migration if the area data shape changes.
- `areas`: Ordered array of strings. Array position = display order. No separate ID or order field needed.

### Why Array of Strings (Not Objects with IDs)

Considered: `{ id: string, name: string, position: number }[]`

Rejected because:
- Area names are already unique (case-insensitive) -- the name IS the identity
- Rename propagation updates the name in staples and trip items by matching on the old name string
- If areas had opaque IDs, staples and trip items would need a `houseAreaId` foreign key, requiring migration of all existing data
- Array position provides order -- no separate position field needed
- The simpler model avoids a foreign key join pattern that adds complexity without benefit for a list of 5-15 items

### Trade-off Acknowledged

Using name-as-identity means rename is a multi-store update (update area list + update all staples + update all trip items). With opaque IDs, only the area list would change on rename. However, opaque IDs require migrating every existing staple and trip item to use the ID instead of the name string, which is a larger and riskier change for the same end result. The name-as-identity approach is chosen for simplicity and zero-migration cost.

---

## Default Seeding Logic

### Trigger

On `AreaStorage.initialize()`:
1. Read `@grocery/house_areas` from AsyncStorage
2. If key does not exist (null), write the default:
   ```
   {
     "schema_version": 1,
     "areas": ["Bathroom", "Garage Pantry", "Kitchen Cabinets", "Fridge", "Freezer"]
   }
   ```
3. If key exists, parse and use the stored value

### Existing User Migration

No data migration needed. Explanation:

- Existing staples have `houseArea: "Bathroom"` (etc.) -- these are already strings at runtime
- Existing trip items have `houseArea: "Fridge"` (etc.) -- same
- The AreaStorage key (`@grocery/house_areas`) is new and does not exist for current users
- On first launch after the update, AreaStorage seeds the 5 defaults
- The seeded defaults match the exact strings already used in staple and trip data
- Result: seamless transition with zero data transformation

---

## Modified Type: HouseArea

### Before

```
type HouseArea = 'Bathroom' | 'Garage Pantry' | 'Kitchen Cabinets' | 'Fridge' | 'Freezer'
```

### After

```
type HouseArea = string
```

This is a type alias that can be retained for documentation purposes, or the type alias can be removed entirely and all references changed to `string`. The crafter decides which approach is cleaner.

### Impact on Existing Types

All types that reference `HouseArea` (`StapleItem`, `TripItem`, `AddStapleRequest`, `AddTripItemRequest`) are unaffected at runtime. The compile-time constraint relaxes from 5 specific strings to any string, with validation enforced by the Area Validation pure function at the point of area creation/rename.

---

## Port Extension: StapleStorage

### New Operation

`updateArea(oldName: string, newName: string): void`

Behavior: Load all staples. For each staple where `houseArea === oldName`, update to `newName`. Save all staples.

This operation is used by:
- Rename: update staples from old name to new name
- Delete with reassignment: update staples from deleted area to target area (same operation, different semantics)

---

## Port Extension: TripStorage

### New Operation

`updateItemArea(oldName: string, newName: string): void`

Behavior: Load active trip. For each trip item where `houseArea === oldName`, update to `newName`. Save trip.

Same dual-use as StapleStorage: supports both rename and delete-reassignment.

---

## Validation Rules (Data Constraints)

| Rule | Constraint | Enforced By |
|------|-----------|-------------|
| Non-empty | `name.trim().length > 0` | Area Validation pure function |
| Unique (case-insensitive) | No existing area with `existingName.toLowerCase() === name.trim().toLowerCase()` | Area Validation pure function |
| Max length | `name.length <= 40` | Area Validation pure function |
| Minimum 1 area | `areas.length > 1` before delete | Area Management Service |

### Validation Result Shape

The validation function returns a discriminated result:
- Success: `{ valid: true, trimmedName: string }`
- Failure: `{ valid: false, error: 'empty' | 'duplicate' | 'too-long' }`

The `trimmedName` is returned on success so the caller uses the cleaned value. The `error` discriminant enables the UI to show the correct message.

---

## Storage Key Summary

| Key | Schema Version | Data | Owner |
|-----|---------------|------|-------|
| `@grocery/house_areas` | 1 | Ordered area name array | AreaStorage adapter (NEW) |
| `@grocery/staple_library` | (existing) | Staple item array | StapleStorage adapter |
| `@grocery/active_trip` | (existing) | Trip object with items | TripStorage adapter |
| `@grocery/trip_checkoffs` | (existing) | Check-off timestamp map | TripStorage adapter |

---

## Data Size Estimates

| Data | Typical Size | Max Expected |
|------|-------------|-------------|
| Area list (10 areas, 20 chars avg) | ~300 bytes | ~1 KB (25 areas) |
| Staple library | ~10-50 KB | Same as before |
| Active trip | ~5-20 KB | Same as before |

The area list is negligible. No performance concern for full-document read/write.
