# Architecture Brief: Grocery Smart List

## Application Architecture

### System Context

Grocery Smart List is a React Native / Expo SDK 54 mobile application targeting Android and web. A single authenticated user (Clemens) uses both platforms simultaneously during trip planning, and Android only during shopping. All data is scoped to the authenticated user via Firebase Auth. Firestore is the cloud data store; AsyncStorage provides local fallback for legacy/unauthenticated mode.

### Quality Attributes (Priority Order)

1. **Real-time consistency** -- changes on one device appear on the other within 5 seconds
2. **Fault tolerance** -- sync failures must not block user interaction; local cache remains authoritative for writes
3. **Maintainability** -- hexagonal architecture preserved; new adapters follow existing patterns
4. **Testability** -- domain logic testable without Firestore; adapters testable via port interfaces
5. **Operational simplicity** -- single-user app, no backend services, Firestore handles sync infrastructure

### Constraints

- Team size: 1 developer
- Functional paradigm: factory functions, pure domain functions, hooks (no classes)
- Expo SDK 54 with Firebase JS SDK (not React Native Firebase)
- Existing hexagonal architecture with ports-and-adapters must be preserved
- `persistentLocalCache()` already enabled on Firestore client
- Last-write-wins conflict resolution (single-user app)

### Architectural Style

**Modular monolith with ports-and-adapters (hexagonal)** -- the existing style. No change warranted. Team of 1, single deployment target, infrastructure independence via ports already established.

### C4 System Context (L1)

```mermaid
C4Context
  title System Context -- Grocery Smart List

  Person(clemens, "Clemens", "Household grocery shopper")
  System(app, "Grocery Smart List", "React Native / Expo SDK 54 mobile app for multi-device grocery planning and shopping")
  System_Ext(firestore, "Google Cloud Firestore", "Real-time document database with offline persistence")
  System_Ext(firebase_auth, "Firebase Authentication", "Email/password authentication provider")

  Rel(clemens, app, "Plans trips and shops with", "Android + Web")
  Rel(app, firestore, "Reads and writes grocery data via", "onSnapshot listeners + setDoc writes")
  Rel(app, firebase_auth, "Authenticates via", "Firebase JS SDK")
```

### C4 Container (L2)

```mermaid
C4Container
  title Container Diagram -- Grocery Smart List

  Person(clemens, "Clemens")

  Container_Boundary(app, "Grocery Smart List App") {
    Container(ui, "React UI Layer", "React Native + Expo", "Screens, components, navigation")
    Container(hooks, "Hook Orchestration Layer", "React Hooks", "Bridges domain services to React state; manages listener lifecycle")
    Container(domain, "Domain Layer", "Pure TypeScript", "StapleLibrary, TripService, AreaManagement -- business rules")
    Container(ports, "Port Interfaces", "TypeScript types", "StapleStorage, TripStorage, AreaStorage, SectionOrderStorage")
    Container(firestore_adapters, "Firestore Adapters", "Firebase JS SDK", "Real-time listeners + cached read/write for all storage ports")
    Container(async_adapters, "AsyncStorage Adapters", "AsyncStorage", "Local-only storage for legacy/unauthenticated mode")
    Container(migration, "Migration Service", "TypeScript", "One-time AsyncStorage-to-Firestore data transfer")
  }

  System_Ext(firestore, "Cloud Firestore", "Real-time document database")
  System_Ext(firebase_auth, "Firebase Auth", "Authentication")

  Rel(clemens, ui, "Interacts with")
  Rel(ui, hooks, "Reads reactive state from")
  Rel(hooks, domain, "Calls domain operations on")
  Rel(domain, ports, "Depends on")
  Rel(firestore_adapters, ports, "Implements")
  Rel(async_adapters, ports, "Implements")
  Rel(firestore_adapters, firestore, "Subscribes to and writes to")
  Rel(hooks, firestore_adapters, "Creates and manages lifecycle of")
  Rel(migration, async_adapters, "Reads legacy data from")
  Rel(migration, firestore_adapters, "Writes migrated data to")
  Rel(ui, firebase_auth, "Signs in via")
```

### C4 Component (L3) -- Firestore Sync Subsystem

This subsystem has 5+ components and warrants L3 detail.

```mermaid
C4Component
  title Component Diagram -- Firestore Sync Subsystem

  Container_Boundary(firestore_adapters, "Firestore Adapters") {
    Component(staple_adapter, "firestore-staple-storage", "Factory function", "onSnapshot listener on staples doc; cached read/write; calls onChange callback on remote update")
    Component(area_adapter, "firestore-area-storage", "Factory function", "onSnapshot listener on areas doc; cached read/write; calls onChange callback on remote update")
    Component(section_adapter, "firestore-section-order-storage", "Factory function", "onSnapshot listener on sectionOrder doc; cached read/write; calls onChange callback on remote update")
    Component(trip_adapter, "firestore-trip-storage", "Factory function", "onSnapshot listener on trip + carryover docs; cached read/write; calls onChange callback on remote update")
  }

  Container_Boundary(hooks_layer, "Hook Orchestration Layer") {
    Component(init_hook, "useAppInitialization", "React Hook", "Creates adapters with onChange callbacks; stores unsubscribe functions; cleans up on unmount/logout; triggers re-initialization on auth change")
  }

  Container_Boundary(domain_layer, "Domain Layer") {
    Component(staple_lib, "StapleLibrary", "Factory function", "Staple CRUD; delegates to StapleStorage port")
    Component(trip_svc, "TripService", "Factory function", "Trip lifecycle; auto-adds staples to active trip; delegates to TripStorage port")
  }

  ContainerDb(firestore, "Cloud Firestore", "users/{uid}/data/*")

  Rel(init_hook, staple_adapter, "Creates with onChange callback")
  Rel(init_hook, area_adapter, "Creates with onChange callback")
  Rel(init_hook, section_adapter, "Creates with onChange callback")
  Rel(init_hook, trip_adapter, "Creates with onChange callback")
  Rel(staple_adapter, firestore, "Subscribes to staples doc via onSnapshot")
  Rel(area_adapter, firestore, "Subscribes to areas doc via onSnapshot")
  Rel(section_adapter, firestore, "Subscribes to sectionOrder doc via onSnapshot")
  Rel(trip_adapter, firestore, "Subscribes to trip + carryover docs via onSnapshot")
  Rel(init_hook, staple_lib, "Rebuilds domain services on remote data change")
  Rel(init_hook, trip_svc, "Rebuilds domain services on remote data change")
```

### Component Architecture

#### Modified Components

| Component | Current | After | Story |
|-----------|---------|-------|-------|
| `firestore-staple-storage` | `getDoc` at init | `onSnapshot` listener + `onChange` callback | US-01 |
| `firestore-area-storage` | `getDoc` at init | `onSnapshot` listener + `onChange` callback | US-01 |
| `firestore-section-order-storage` | `getDoc` at init | `onSnapshot` listener + `onChange` callback | US-01 |
| `useAppInitialization` | Creates adapters, awaits init | Creates adapters with callbacks, manages unsubscribe lifecycle, re-creates domain services on remote change | US-01, US-04, US-08 |
| `migration.ts` | Migrates staples/areas/sectionOrder | Also migrates trip + carryover | US-06 |
| `AdapterFactories` type | `createTripStorage: () => ...` | `createTripStorage: (uid: string) => ...` (Firestore-backed) | US-02 |

#### New Components

| Component | Responsibility | Story |
|-----------|---------------|-------|
| `firestore-trip-storage` | Firestore adapter for TripStorage port with onSnapshot + cached read/write | US-02, US-03 |

#### Domain-Level Change (US-05)

The orchestration of "new staple auto-adds to active trip" belongs in the hook/orchestration layer, not in the domain. When the staple adapter's `onChange` fires with an updated staple list, the hook compares old vs new staples, creates TripItems for additions, and removes TripItems for deletions. The domain's `TripService` already has `addItem()` and `removeItemByStapleId()`. No new domain types or ports needed.

### Technology Stack

| Technology | Version | License | Rationale |
|------------|---------|---------|-----------|
| React Native | 0.76+ | MIT | Existing; cross-platform mobile |
| Expo SDK | 54 | MIT | Existing; managed workflow |
| Firebase JS SDK | 11.x | Apache 2.0 | Existing; provides `onSnapshot` for real-time listeners |
| TypeScript | 5.x | Apache 2.0 | Existing; strict mode |
| AsyncStorage | 2.x | MIT | Existing; legacy/migration source |

No new technology dependencies required. The `onSnapshot` API is already available in the Firebase JS SDK currently installed.

### Integration Patterns

#### Real-Time Sync Pattern

All four Firestore adapters follow the same pattern:

1. **Subscribe**: `onSnapshot(docRef, callback)` replaces `getDoc(docRef)` during initialization
2. **First callback**: delivers current document state (equivalent to previous `getDoc` behavior)
3. **Subsequent callbacks**: deliver remote changes; adapter updates its internal cache and invokes `onChange` callback
4. **Local writes**: update cache synchronously, call `setDoc` fire-and-forget (unchanged)
5. **Own-write echo**: `onSnapshot` fires for own writes; adapter detects no-change and skips `onChange` callback (compare serialized state)
6. **Cleanup**: `onSnapshot` returns unsubscribe function; stored by init hook and called on unmount/logout

#### onChange Callback Contract

Each Firestore adapter factory accepts an optional `onChange` callback:

- Staple adapter: `onChange: () => void` -- signals that the staple list changed from a remote write
- Area adapter: `onChange: () => void` -- signals that the area list changed from a remote write
- Section order adapter: `onChange: () => void` -- signals that section order changed from a remote write
- Trip adapter: `onChange: () => void` -- signals that trip state changed from a remote write

The callback is intentionally simple (no payload). The hook reads the updated state from the adapter's existing synchronous `loadAll()` / `loadTrip()` methods, then re-creates domain services and triggers React state update.

#### Unsubscribe Lifecycle

Each adapter factory returns an `unsubscribe: () => void` function alongside the storage interface. The init hook collects all unsubscribe functions and calls them:
- On `useEffect` cleanup (component unmount)
- On auth state change (before creating new adapters for new user)
- On explicit logout

#### Trip Migration Pattern (US-06)

Extends existing `migration.ts`:
1. After Firestore trip adapter initializes (first `onSnapshot` delivers current state)
2. If Firestore has no trip document AND AsyncStorage has a trip: write local trip + carryover to Firestore
3. If Firestore already has a trip: use Firestore (cloud wins)
4. Idempotent: re-running migration on an already-migrated user is a no-op

### Quality Attribute Strategies

| Attribute | Strategy |
|-----------|----------|
| Real-time consistency | `onSnapshot` listeners on all 4 document types; <5s propagation via Firestore infrastructure |
| Fault tolerance | Local cache remains authoritative; `setDoc` is fire-and-forget; `persistentLocalCache()` ensures offline writes queue and replay |
| Maintainability | All adapters follow identical factory-function pattern; onChange callback is the only new parameter |
| Testability | Adapters testable via port interfaces; onChange callback testable by invoking it in tests; domain logic unchanged and fully unit-testable |
| No data loss | Migration checks Firestore-empty before writing; cloud-wins when both exist |

### Deployment Architecture

No change. Single Expo app deployed via EAS Build to Android (APK/AAB) and web (static bundle). Firestore is serverless -- no backend to deploy.

### Architecture Enforcement

Style: Hexagonal (Ports and Adapters)
Language: TypeScript
Tool: dependency-cruiser (MIT license, widely adopted, JSON/.dependency-cruiser.js config)

Rules to enforce:
- Domain layer (`src/domain/`) has zero imports from adapters (`src/adapters/`) or hooks (`src/hooks/`)
- Port interfaces (`src/ports/`) have zero imports from adapters or domain
- No adapter-to-adapter dependencies (e.g., Firestore adapter must not import AsyncStorage adapter)
- All dependencies point inward: UI -> hooks -> domain -> ports <- adapters

### External Integrations

| Service | API Type | What We Consume | Contract Test Recommendation |
|---------|----------|-----------------|------------------------------|
| Google Cloud Firestore | Firebase JS SDK (WebSocket + HTTP) | Document read/write, real-time listeners (`onSnapshot`) | Consumer-driven contracts via Pact-JS for Firestore document schema validation. Note: Firestore SDK is a thick client; primary risk is document schema drift, not API contract changes. Schema validation tests (verifying serialized Trip/Staple structure round-trips correctly) provide more value than traditional contract tests here. |
| Firebase Authentication | Firebase JS SDK | Email/password sign-in, auth state observer | Low risk -- standard OAuth/token flow. No custom contract tests needed beyond existing auth integration tests. |

### Handoff to Platform Architect

Contract tests recommended for Firestore document schemas -- the Trip, Staple, Area, and SectionOrder documents are serialized/deserialized across devices. A schema validation test suite should verify that:
- `Trip` objects round-trip through Firestore serialization without data loss
- `StapleItem` objects preserve all fields including `storeLocation` nested structure
- `completedAreas` array survives serialization (currently optional field on Trip)

Development paradigm: **Functional** (factory functions, pure domain functions, React hooks; no classes).
