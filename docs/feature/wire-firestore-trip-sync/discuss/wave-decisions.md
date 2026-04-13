# DISCUSS Decisions — wire-firestore-trip-sync

## Key Decisions

- [D1] Minimal story set (3 stories): scope is wiring only, not new adapter work (see: correct-sync-behavior US-02, US-03)
- [D2] Change AdapterFactories.createTripStorage signature to accept uid and options: aligns with ADR-002 and matches createStapleStorage pattern
- [D3] Skip JTBD: job is identical to correct-sync-behavior ("sync trip state across devices in real-time")
- [D4] Skip journey map: no UX change — same screens, same interactions, data now syncs

## Requirements Summary

- Primary need: wire existing Firestore trip adapter into production factories, add onChange handler, ensure TripService notifies subscribers on remote changes
- Walking skeleton scope: not applicable (brownfield wiring)
- Feature type: cross-cutting (adapter wiring + domain notification + hook orchestration)

## Constraints Established

- TripStorage port interface must not change
- Existing correct-sync-behavior tests must continue to pass
- Legacy (unauthenticated) mode must keep using AsyncStorage

## Upstream Changes

- None — this feature completes the vision established in correct-sync-behavior without changing any prior assumptions
