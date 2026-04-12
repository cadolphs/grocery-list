# ADR-001: Real-Time Listener Integration Strategy

## Status

Accepted

## Context

The Grocery Smart List app uses a hexagonal architecture with ports-and-adapters. Currently, all Firestore adapters use `getDoc` (one-time read) during initialization. The app needs real-time sync so that changes on one device (Android or web) appear on the other within 5 seconds.

The key design question: how should real-time `onSnapshot` listeners integrate into the existing hexagonal architecture?

### Business Drivers

- Real-time consistency across devices during simultaneous planning
- Fault tolerance -- sync failures must not block interaction
- Maintainability -- minimal disruption to existing clean architecture

### Constraints

- Functional paradigm (factory functions, no classes)
- Existing port interfaces (`StapleStorage`, `TripStorage`, etc.) are synchronous read/write
- Single developer team -- simplicity is critical
- Firebase JS SDK provides `onSnapshot` returning an unsubscribe function

## Decision

**Option A: Adapter-level onChange callback** -- Firestore adapter factories accept an optional `onChange: () => void` callback. Internally, adapters use `onSnapshot` instead of `getDoc`. When remote data arrives, the adapter updates its cache and invokes `onChange`. The hook layer (useAppInitialization) provides the callback and uses it to re-read data from the adapter and update React state.

Adapter factories also return an `unsubscribe: () => void` function that the hook layer calls during cleanup.

The existing port interfaces (`StapleStorage`, `TripStorage`, etc.) remain unchanged. The `onChange` callback and `unsubscribe` function are part of the extended Firestore adapter type, not the port.

## Alternatives Considered

### Option B: Reactive Ports (subscribe/unsubscribe on port interface)

Add `subscribe(callback): unsubscribe` to each port interface. All adapters (Firestore, AsyncStorage, null) would implement it.

**Evaluation:**
- Pro: Ports become explicitly reactive; any adapter could support real-time updates
- Con: Forces every adapter implementation (AsyncStorage, null, test doubles) to implement subscribe/unsubscribe even when they never have remote changes
- Con: Changes the port contract, requiring updates across all existing adapters and tests
- Con: Over-engineering for a single-user app where only Firestore needs real-time capability
- Rejected: Violates simplest-solution principle; port changes cascade to 10+ files

### Option C: Hook-Level Listeners (hooks call onSnapshot directly)

Hooks (useAppInitialization or useTrip) import `onSnapshot` from Firebase SDK and manage listeners directly, bypassing the adapter layer for reads.

**Evaluation:**
- Pro: Quick to implement; no adapter changes needed
- Con: Breaks hexagonal architecture -- domain/hook layer now depends on Firestore SDK
- Con: Makes hook layer untestable without mocking Firebase internals
- Con: Duplicates cache management logic between hooks and adapters
- Rejected: Violates dependency inversion; hooks should not know about infrastructure

### Option D: Event Bus / Pub-Sub

Introduce a lightweight in-process event bus. Adapters publish events ("staples-changed", "trip-changed"), hooks subscribe.

**Evaluation:**
- Pro: Maximum decoupling; adapters and hooks have no direct reference to each other
- Con: Introduces new infrastructure (event bus) for 4 event types in a single-user app
- Con: Harder to debug -- indirect flow through event bus obscures data path
- Con: No existing event bus in the codebase; adds a dependency or custom implementation
- Rejected: Over-engineering for the problem size; direct callback is simpler and sufficient

## Consequences

### Positive

- Port interfaces remain unchanged -- zero impact on domain logic, existing adapters, and tests
- Adapter factory signature changes are additive (optional `onChange` parameter)
- Listener lifecycle (subscribe/unsubscribe) is managed in one place (useAppInitialization)
- Pattern is consistent across all 4 Firestore adapters
- Easy to test: inject mock onChange, verify it fires when cache updates

### Negative

- The `onChange` callback is on the Firestore adapter type, not the generic port -- this means the hook layer must know it is working with Firestore adapters (minor coupling, acceptable since adapter creation is already in the hook layer)
- Own-write echo detection adds a small amount of complexity to each adapter (compare previous vs new state)

### Quality Attribute Impact

| Attribute | Impact |
|-----------|--------|
| Maintainability | Positive -- minimal change surface; existing tests unaffected |
| Testability | Positive -- onChange is a plain function; easy to test in isolation |
| Performance | Neutral -- onSnapshot first callback replaces getDoc with equivalent latency |
| Reliability | Positive -- Firestore SDK handles reconnection and offline queuing |
