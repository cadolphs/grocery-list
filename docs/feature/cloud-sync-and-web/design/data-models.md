# Data Models — cloud-sync-and-web

## Firestore Document Structure

All data lives under a single user path: `users/{uid}/data/`

### Document: `staples`

```typescript
// Firestore path: users/{uid}/data/staples
{
  items: StapleItem[]  // Reuses existing domain type exactly
  updatedAt: Timestamp // Server timestamp for conflict ordering
}
```

Maps to: `StapleStorage` port

### Document: `areas`

```typescript
// Firestore path: users/{uid}/data/areas
{
  items: string[]      // HouseArea[] — array of area names
  updatedAt: Timestamp
}
```

Maps to: `AreaStorage` port

### Document: `sectionOrder`

```typescript
// Firestore path: users/{uid}/data/sectionOrder
{
  order: string[] | null  // null = use default order
  updatedAt: Timestamp
}
```

Maps to: `SectionOrderStorage` port

### Document: `trip`

```typescript
// Firestore path: users/{uid}/data/trip
{
  trip: Trip | null           // Active trip or null
  checkoffs: Record<string, boolean>  // Item checkoff state
  carryover: TripItem[]       // Unbought items for next trip
  updatedAt: Timestamp
}
```

Maps to: `TripStorage` port

## Domain Type Reuse

All Firestore documents store the exact same TypeScript types as the current AsyncStorage adapters. No type transformations needed. The only addition is `updatedAt` (Firestore server timestamp) for conflict ordering.

## Serialization

- Firestore natively handles JSON-like objects, arrays, strings, numbers, booleans, nulls
- All domain types are already JSON-serializable (no Date objects, no Maps, no Sets)
- `createdAt` and `checkedAt` fields are ISO strings, stored as Firestore strings
- `updatedAt` uses `serverTimestamp()` for ordering — set by Firestore, not the client

## Conflict Resolution

**Strategy**: Last-write-wins at the document level.

- Each document has an `updatedAt` server timestamp
- Firestore's offline SDK queues writes and applies them in order
- Firestore's behavior: the last write to reach the server wins
- Since both clients use `onSnapshot`, both will converge to the same state once sync completes

**Known limitation — single-device active editing**: This architecture assumes one device actively editing at a time. If the same user edits staples on two devices while either is offline, last-write-wins at the document level may cause data loss. Example: User adds "Olive Oil" on mobile (offline), then adds "Pasta" on web. When mobile syncs, whichever write reaches the server last overwrites the other.

**Why this is acceptable**: Single user, personal app. The typical workflow is "manage staples at home on laptop, shop at store on phone" — not simultaneous editing. The user controls when they edit on each device.

**Future mitigation if needed**: Move from single-document-per-collection to per-item subcollections (e.g., `users/{uid}/staples/{stapleId}`). This allows per-item writes that don't overwrite each other. Requires adapter changes only — domain logic is unaffected.

## Migration Mapping

| AsyncStorage Key | Firestore Document |
|-----------------|-------------------|
| `@grocery/staple_library` | `users/{uid}/data/staples` |
| `@grocery/house_areas` | `users/{uid}/data/areas` |
| `@grocery/section_order` | `users/{uid}/data/sectionOrder` |
| `@grocery/active_trip` + `@grocery/trip_checkoffs` + `@grocery/trip_carryover` | `users/{uid}/data/trip` |

Migration reads from AsyncStorage keys and writes to Firestore documents. One-time operation.
