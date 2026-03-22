# ADR-002: Local Storage Strategy

## Status

Proposed

## Context

The Grocery Smart List requires offline-first data persistence for:
- **Staple library**: ~50-100 items, read frequently, written infrequently
- **Active trip state**: ~30-50 items with check-off state, written on every check-off (high frequency in-store)
- **Check-off persistence**: Must survive app restart, write within 500ms of user action

Performance requirements:
- App launch to ready state: < 2 seconds (includes loading all data)
- Check-off feedback: < 100ms (UI), persistence within 500ms
- Suggestions: < 300ms (requires staple library in memory)

The existing codebase already uses `@react-native-async-storage/async-storage` for checked items persistence.

Dataset is small: < 50 KB total across all storage keys.

## Decision

Use **AsyncStorage** with JSON serialization for all persistence. Two storage keys:
- `staple_library`: Full staple library as JSON array
- `active_trip`: Full trip state (items, check-offs, metadata) as JSON object

Include a `schema_version` key for future data migration support.

### Storage pattern:
- **Read**: Load full JSON on app mount, deserialize into React state
- **Write (staples)**: Serialize and write full library on staple CRUD operations
- **Write (check-off)**: Optimistic UI update first, then async write of trip state. Use separate check-off state if full trip serialization is too slow (measure first, optimize if needed).

## Alternatives Considered

### Alternative 1: expo-sqlite (SQLite via Expo)

**Evaluation**:
- (+) Relational queries, indexing, partial reads
- (+) Better for large datasets (1000+ items)
- (+) ACID transactions
- (-) Requires SQL schema management and migrations
- (-) Over-engineered for < 100 items -- JSON serialization is simpler
- (-) Adds build complexity (native module)
- (-) No benefit for the primary access pattern (load all items at once)

**Rejected because**: The dataset is < 50 KB. All items are loaded into memory at once. There are no complex queries -- the grouping logic is done in-memory by pure functions. SQL adds complexity without benefit at this scale.

### Alternative 2: react-native-mmkv

**Evaluation**:
- (+) 30x faster than AsyncStorage for reads/writes
- (+) Synchronous API (no async/await needed)
- (+) MIT license, well-maintained
- (-) Requires Expo dev client (not compatible with Expo Go for development)
- (-) Adds native module dependency and build complexity
- (-) AsyncStorage performance is already sufficient for < 50 KB

**Rejected because**: AsyncStorage performance is adequate for the dataset size. MMKV's speed advantage is irrelevant when total data is < 50 KB. The build complexity cost (losing Expo Go for development) outweighs the performance gain. If storage latency becomes a measured problem, MMKV can be swapped in via the storage port without changing domain logic.

### Alternative 3: WatermelonDB

**Evaluation**:
- (+) Designed for React Native offline-first apps
- (+) Lazy loading, observable queries
- (+) Built-in sync support for future cloud sync
- (-) Designed for apps with thousands of records and complex sync
- (-) Heavy dependency (SQLite under the hood, proprietary sync protocol)
- (-) Significant learning curve
- (-) Over-engineered for single-user, local-only, < 100 items

**Rejected because**: WatermelonDB solves problems this app does not have (multi-user sync, large datasets, lazy loading). It would add substantial complexity for zero benefit in the current scope.

## Consequences

### Positive

- Zero new dependencies (AsyncStorage already installed)
- Simple mental model: load JSON, work in memory, write JSON
- Proven technology in the existing walking skeleton
- Swappable via storage port if needs change
- Works with Expo Go for fast development iteration

### Negative

- Full serialization on every write (acceptable for < 50 KB)
- No partial updates (mitigated: separate keys for library vs trip)
- Async API requires await (mitigated: optimistic UI pattern for check-offs)
- No built-in migration tooling (mitigated: manual version check in adapter)

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Offline-first | Positive -- AsyncStorage is fully local, zero network dependency |
| Performance | Neutral -- sufficient for dataset size, optimistic UI handles perceived latency |
| Maintainability | Positive -- simple, well-understood technology, swappable via port |
| Reliability | Positive -- AsyncStorage is battle-tested on React Native |
