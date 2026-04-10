# Wave Decisions: correct-sync-behavior (DESIGN)

## Decision 1: Interaction Mode

**Propose** -- autonomous analysis of SSOT and DISCUSS artifacts. No interactive questions.

## Decision 2: Architectural Style

**No change** -- existing hexagonal / ports-and-adapters with functional paradigm. Team of 1, single deployment, time-to-market priority. Modular monolith with dependency inversion is the correct fit.

## Decision 3: Real-Time Listener Integration

**Adapter-level onChange callback** (ADR-001, Option A). Firestore adapter factories accept an optional `onChange: () => void` callback. Listeners managed in useAppInitialization hook. Ports remain unchanged.

Rejected alternatives:
- Reactive ports (subscribe on port interface) -- over-engineering, cascading changes
- Hook-level listeners (bypass adapters) -- breaks hexagonal architecture
- Event bus -- unnecessary indirection for 4 event types

## Decision 4: Trip Storage Backend

**Firestore single-document** (ADR-002). Trip and carryover stored as single documents at `users/{uid}/data/trip` and `users/{uid}/data/carryover`. Follows existing adapter pattern.

Rejected alternative: sub-collection per item (over-engineering, cost, port mismatch).

## Decision 5: Staple-to-Trip Auto-Add Location

**Hook orchestration layer**, not domain layer. The `onChange` callback in useAppInitialization detects added/removed staples by comparing old vs new staple lists, then calls `TripService.addItem()` / `TripService.removeItemByStapleId()`. The domain remains pure and unaware of sync.

## Decision 6: Conflict Resolution

**Last-write-wins** -- single-user app. Firestore's default behavior. No vector clocks or CRDTs needed. If the user modifies the same item on two devices simultaneously, the last write persists. Acceptable risk given the usage pattern (planning on one device at a time, minor overlap).

## Decision 7: Own-Write Echo Handling

**Serialized state comparison**. When `onSnapshot` fires, the adapter compares the incoming data to the current cache. If identical (own write echoed back), the `onChange` callback is not invoked. This prevents unnecessary React re-renders.

## Decision 8: New Dependencies

**None**. The `onSnapshot` API is already available in the installed Firebase JS SDK. No new packages needed.

## Decision 9: Architecture Enforcement

**dependency-cruiser** recommended for CI enforcement of hexagonal dependency rules. To be set up during DELIVER wave.

## Component Boundary Summary

| Layer | Components | Changes |
|-------|-----------|---------|
| Ports | StapleStorage, TripStorage, AreaStorage, SectionOrderStorage | No changes |
| Firestore Adapters | firestore-staple-storage, firestore-area-storage, firestore-section-order-storage | Modified: getDoc -> onSnapshot, add onChange + unsubscribe |
| Firestore Adapters | firestore-trip-storage (NEW) | New: TripStorage port over Firestore with onSnapshot |
| Migration | migration.ts | Extended: trip + carryover migration |
| Hooks | useAppInitialization | Modified: onChange callbacks, unsubscribe lifecycle, re-create services on remote change |
| Domain | StapleLibrary, TripService | No changes |

## Handoff Notes for Acceptance Designer

- All acceptance criteria from DISCUSS wave are behavioral (WHAT, not HOW) -- ready for acceptance test design
- Key testable boundary: the onChange callback on adapters is the integration seam
- Duplicate prevention (US-07) is a domain-level guard on stapleId -- unit-testable
- Migration (US-06) is testable via the existing migration function pattern with test doubles
