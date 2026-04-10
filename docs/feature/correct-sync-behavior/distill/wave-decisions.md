# Wave Decisions: correct-sync-behavior (DISTILL)

## Decision 1: Walking Skeleton Strategy

**Strategy A: In-Memory** -- Walking skeletons use null/in-memory adapters with onChange callbacks. Firestore is an external thick-client service; real adapter integration belongs in adapter-level tests.

## Decision 2: Test Technology

**Jest + TypeScript** -- Matches existing test infrastructure. No Gherkin feature files; scenarios are expressed as describe/it blocks with Given-When-Then comments (established pattern in this codebase).

## Decision 3: Driving Port Entry Points

Tests enter through these driving ports:
- `createStapleLibrary(storage)` -- staple CRUD
- `createTrip(storage, areas)` -- trip lifecycle
- `initializeApp(authUser, factories)` -- orchestration, migration, adapter lifecycle
- `AdapterFactories` -- adapter creation with onChange/unsubscribe extension

Tests do NOT directly test: Firestore SDK calls, onSnapshot internals, React state management, UI components.

## Decision 4: onChange Callback Testing Approach

The `onChange: () => void` callback on Firestore adapters is the integration seam. Acceptance tests simulate remote changes by:
1. Mutating the in-memory adapter's state directly (simulating what onSnapshot would do)
2. Calling the onChange callback (simulating the adapter notifying the hook layer)
3. Verifying observable outcomes through driving ports

This avoids coupling tests to Firestore SDK while proving the orchestration pattern works.

## Decision 5: KPI Scenarios

**Skipped** -- No `kpi-contracts.yaml` exists. The outcome-kpis.md from DISCUSS describes manual measurement (cross-device timing, memory profiling). These are not automatable as acceptance tests.

## Decision 6: Error Path Coverage

13 of 29 scenarios (45%) cover error paths, edge cases, and infrastructure failures. This exceeds the 40% minimum.

## Decision 7: Property-Shaped Scenarios

S-24 (re-added staple gets fresh trip item) is tagged `@property` -- it expresses the invariant that duplicate detection is by stapleId, not name. The DELIVER wave crafter should implement this with property-based testing using generated staple IDs.

## Mandate Compliance Evidence

- **CM-A**: All tests import through driving ports: `createStapleLibrary`, `createTrip`, `initializeApp`, `AdapterFactories`. Zero internal component imports (no Firestore SDK, no React state, no adapter internals).
- **CM-B**: Business language only in scenario descriptions. Technical terms (onChange, unsubscribe) appear only in step implementation comments, not in Gherkin-style descriptions.
- **CM-C**: 3 walking skeletons (user value E2E) + 26 focused scenarios. Walking skeletons answer "can Clemens sync his grocery data across devices?"
- **CM-D**: Pure function extraction: duplicate detection (`trip.items.some(i => i.stapleId === newId)`), staple diff (old vs new list comparison), own-write detection (serialized state comparison). These are testable without fixtures. Impure code (Firestore writes, onSnapshot) isolated behind adapter interfaces.
