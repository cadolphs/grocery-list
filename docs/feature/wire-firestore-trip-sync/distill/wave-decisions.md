# DISTILL Decisions — wire-firestore-trip-sync

## Reconciliation

Reconciliation passed — 0 contradictions. DESIGN and DEVOPS were skipped (scope too small). DISCUSS decisions align with ADR-001 and ADR-002.

## Key Decisions

- [DWD-01] Walking Skeleton Strategy: **A (Full InMemory)** — feature is pure wiring; no new driven ports with I/O. Null adapters with onChange/simulateRemoteChange cover all scenarios.
- [DWD-02] Single test file: all 5 scenarios in one file since the feature is 3 tightly-coupled stories.
- [DWD-03] No scaffold files needed: all production modules already exist (trip.ts, useAppInitialization.ts, null-trip-storage.ts). Changes are to existing code, not new modules.

## Adapter Coverage

| Adapter | @real-io scenario | Covered by |
|---------|-------------------|------------|
| firestore-trip-storage | N/A | Already tested in correct-sync-behavior (firestore-trip-storage.test.ts) |
| null-trip-storage | InMemory | All acceptance tests use NullTripStorage with onChange |

No new adapters introduced — existing adapter tests provide real-I/O coverage.

## Graceful Degradation

- DEVOPS missing: default environment matrix applied (not relevant for this feature)
- DESIGN missing: driving ports identified from architecture brief (initializeApp, TripService)
