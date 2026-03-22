# ADR-003: Async/Sync Port Bridge Strategy

## Status

Proposed

## Context

The Grocery Smart List domain layer defines synchronous storage port interfaces:

- `StapleStorage.loadAll(): StapleItem[]` (synchronous)
- `StapleStorage.save(item: StapleItem): void` (synchronous)
- `TripStorage.loadTrip(): Trip | null` (synchronous)
- `TripStorage.saveTrip(trip: Trip): void` (synchronous)

These ports are already implemented and tested with synchronous null adapters (in-memory). The domain services (createStapleLibrary, createTrip) call these ports synchronously.

However, the production storage technology -- AsyncStorage -- is inherently asynchronous:

- `AsyncStorage.getItem(key): Promise<string | null>`
- `AsyncStorage.setItem(key, value): Promise<void>`

This creates a fundamental mismatch: domain services expect synchronous port operations, but the underlying storage is async.

### Quality Attribute Priorities

1. **Preserve existing domain contracts** -- the domain layer is complete and tested; changes are costly
2. **Performance** -- check-off feedback < 100ms requires synchronous UI updates
3. **Simplicity** -- solo developer, minimize abstraction layers
4. **Offline-first** -- all data must persist to local storage reliably

## Decision

**Cached adapters with async initialization.**

Each AsyncStorage adapter maintains an in-memory cache. The adapter lifecycle:

1. **Initialization phase** (async): Read all data from AsyncStorage into the in-memory cache. This happens once during app startup.
2. **Operational phase** (sync reads, async writes): All read operations return data from the in-memory cache synchronously. All write operations update the cache synchronously (satisfying the port contract), then persist to AsyncStorage asynchronously in the background (fire-and-forget).

The adapter factory function returns an object that satisfies the port interface PLUS an additional `initialize(): Promise<void>` method. The app root calls `initialize()` during startup (showing a loading screen), then passes the adapter to domain services. Domain services only see the synchronous port interface.

### Write-Through Cache Pattern

On every mutation:
1. Update in-memory cache (synchronous -- port contract satisfied)
2. Trigger `AsyncStorage.setItem()` (async -- no await, fire-and-forget)
3. If AsyncStorage write fails, log error but do not throw (data is in cache for current session; may be lost on app restart)

## Alternatives Considered

### Alternative 1: Change port signatures to async (Promises)

Modify all port interfaces to return Promises. Update domain services to use async/await.

**Evaluation**:
- (+) Direct, no caching layer needed
- (+) Simpler adapter implementation
- (-) Requires rewriting all domain service functions to be async
- (-) Requires rewriting all existing domain tests (they use synchronous null adapters)
- (-) Infects domain layer with async concerns (Promise handling, error recovery)
- (-) Makes pure domain functions impure (they now deal with async effects)
- (-) The null adapters would need to return Promises for no benefit (they are in-memory)

**Rejected because**: The domain layer is complete, tested, and working. Introducing async throughout the domain adds complexity to every service function and every test, for the sole benefit of matching AsyncStorage's API. The domain should not know about storage technology details.

### Alternative 2: Use synchronous storage (react-native-mmkv)

Replace AsyncStorage with MMKV, which provides synchronous read/write APIs.

**Evaluation**:
- (+) No async/sync mismatch to bridge
- (+) Faster than AsyncStorage (30x for reads/writes)
- (-) Requires Expo dev client (breaks Expo Go development workflow)
- (-) Adds native module dependency
- (-) Already rejected in ADR-002 for these reasons
- (-) Solving the wrong problem -- the mismatch is a wiring concern, not a storage concern

**Rejected because**: Changing the storage technology to avoid an adapter pattern is over-engineering. The cached adapter is a standard pattern that solves the problem at the correct layer (adapter, not infrastructure).

### Alternative 3: Make domain services lazy-initialized

Domain services do not call storage on construction. Instead, all operations check if data is loaded and load it on first access (lazy).

**Evaluation**:
- (+) No explicit initialization step
- (-) Every domain operation must handle the "not yet loaded" case
- (-) First call to any operation would be async (breaks port contract)
- (-) Adds complexity to every domain function
- (-) Testing becomes harder (must handle loading state in every test)

**Rejected because**: Pushes infrastructure concerns into domain logic. Every domain function would need to handle a loading edge case that only exists because of AsyncStorage. The initialization concern belongs in the app root, not the domain.

## Consequences

### Positive

- Domain layer remains unchanged -- zero modifications to services, types, or tests
- Null adapters remain unchanged -- testing continues to work as-is
- Synchronous reads enable the optimistic UI pattern naturally (check-off is instant)
- Initialization is explicit and observable (loading screen while data loads)
- Standard pattern (write-through cache) that is well-understood

### Negative

- Adds a caching layer in the adapter (more code than a direct async adapter)
- Data loss risk: if app crashes between cache update and AsyncStorage write, the last mutation is lost (acceptable for grocery list data)
- Adapter has two "phases" (pre-init and post-init) -- calling port methods before init would return empty/stale data (mitigated: app root ensures init completes before rendering)
- The `initialize()` method is not part of the port interface, requiring the app root to know about the adapter's extended type

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Performance | Positive -- synchronous reads, no await on UI path |
| Maintainability | Positive -- domain layer untouched, adapter is self-contained |
| Testability | Positive -- null adapters unchanged, adapter testable with AsyncStorage mock |
| Reliability | Slightly negative -- fire-and-forget writes have small data loss window |
| Simplicity | Neutral -- adds cache layer but avoids async infection of domain |
