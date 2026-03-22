# Data Models: Grocery List UI

**Feature ID**: grocery-list-ui
**Date**: 2026-03-18

---

## Domain Types (Existing -- No Changes)

All domain types are defined in `src/domain/types.ts` and are already implemented and tested. This document focuses on the **storage layer** data models only.

---

## AsyncStorage Key Schema

| Key | Value Format | Max Size | Read Frequency | Write Frequency |
|-----|-------------|----------|---------------|----------------|
| `@grocery/staple_library` | JSON string (StapleItem[]) | ~20 KB | Once on app start | On staple add/remove |
| `@grocery/active_trip` | JSON string (Trip) | ~10 KB | Once on app start | On every check-off, skip, add |
| `@grocery/checkoffs` | JSON string ([[string, string], ...]) | ~2 KB | Once on app start | On every check-off |
| `@grocery/schema_version` | JSON string (number) | ~10 bytes | Once on app start | On migration |

### Key Prefix Convention

All keys use the `@grocery/` prefix to namespace them away from any other storage consumers in the app (e.g., Firebase auth tokens, Expo internal keys).

---

## Serialization Strategy

### StapleItem[] Serialization

Stored under `@grocery/staple_library`:

```json
[
  {
    "id": "staple-1710000000000-abc1234",
    "name": "Whole milk",
    "houseArea": "Fridge",
    "storeLocation": {
      "section": "Dairy",
      "aisleNumber": 3
    },
    "type": "staple",
    "createdAt": "2026-03-17T10:00:00.000Z"
  }
]
```

All StapleItem fields are JSON-safe (string, number, null). No special serialization needed. `JSON.stringify` / `JSON.parse` round-trips without loss.

### Trip Serialization

Stored under `@grocery/active_trip`:

```json
{
  "id": "trip-1710000000000-xyz7890",
  "items": [
    {
      "id": "trip-item-1710000000000-def4567",
      "name": "Whole milk",
      "houseArea": "Fridge",
      "storeLocation": { "section": "Dairy", "aisleNumber": 3 },
      "itemType": "staple",
      "stapleId": "staple-1710000000000-abc1234",
      "source": "preloaded",
      "needed": true,
      "checked": false,
      "checkedAt": null
    }
  ],
  "status": "active",
  "createdAt": "2026-03-17T10:00:00.000Z"
}
```

All Trip and TripItem fields are JSON-safe. No special serialization needed.

### Checkoff Map Serialization

Stored under `@grocery/checkoffs`:

```json
[
  ["trip-item-def4567", "2026-03-17T11:30:00.000Z"],
  ["trip-item-ghi8901", "2026-03-17T11:31:00.000Z"]
]
```

The ReadonlyMap<string, string> is serialized as an array of [key, value] entries. This is the standard JavaScript Map serialization pattern:
- Serialize: `JSON.stringify([...map.entries()])`
- Deserialize: `new Map(JSON.parse(value))`

---

## Migration / Versioning Approach

### Schema Version

Stored under `@grocery/schema_version` as a plain number.

- **Version 1**: Initial schema as defined above

### Migration Strategy

The AsyncStorage adapters handle migration during their `initialize()` phase:

1. Read `@grocery/schema_version`
2. If missing or version < current: run migrations sequentially
3. Write updated `@grocery/schema_version`

Migration logic lives entirely in the adapter layer. Domain types are unaware of storage versions.

### Migration Rules

- Migrations are additive (add fields with defaults, never remove fields)
- Each migration is idempotent (safe to re-run)
- Migrations run before any data is served to domain services
- If migration fails, fall back to empty state (fresh start) rather than crashing

### Version 1 (Current)

No migration needed. If `@grocery/schema_version` is missing, assume version 1 (first-time install or pre-versioning data).

---

## Data Size Budget

| Data | Items | Estimated Size | Within Budget |
|------|-------|---------------|--------------|
| Staple library | 50-100 items | 10-20 KB | Yes |
| Active trip | 30-50 items | 5-10 KB | Yes |
| Checkoff map | 30-50 entries | 1-2 KB | Yes |
| Schema version | 1 value | ~10 bytes | Yes |
| **Total** | | **< 35 KB** | **Yes** |

AsyncStorage has a default limit of 6 MB on Android (configurable) and effectively unlimited on iOS. The data budget is well within limits.

---

## Cache Consistency

### Invariant: In-memory cache is always authoritative after initialization

Once an adapter is initialized (AsyncStorage data loaded into cache), the in-memory cache is the source of truth for reads. AsyncStorage is the durability layer for writes.

### Write-Through Pattern

Every mutation follows this sequence:
1. Update in-memory cache (synchronous)
2. Trigger AsyncStorage write (asynchronous, fire-and-forget)

If the AsyncStorage write fails:
- The in-memory cache still has the correct data for the current session
- The data may be lost on app restart
- This is acceptable for a grocery list app (low-consequence data loss)
- The adapter should log the error for debugging

### No Concurrent Writers

This is a single-user, single-process app. There are no concurrent writers to AsyncStorage. Race conditions between reads and writes are not a concern.

---

## Data Lifecycle

| Event | Staple Library | Active Trip | Checkoffs |
|-------|---------------|-------------|-----------|
| App install | Empty array | null | Empty map |
| Add staple | Item appended | No change | No change |
| Start trip | No change | Created with items | Cleared |
| Check off item | No change | Item updated | Entry added |
| Complete trip | No change | Cleared (or replaced with next trip) | Cleared |
| App restart | Loaded from storage | Loaded from storage | Loaded from storage |
| Uninstall | All cleared by OS | All cleared by OS | All cleared by OS |
