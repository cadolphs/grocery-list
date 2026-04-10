# Walking Skeleton: correct-sync-behavior

## Strategy

**Strategy A: In-Memory Walking Skeletons** -- This is a React Native app where Firestore is an external service. Walking skeletons use null/in-memory adapters with onChange callbacks to prove the orchestration wiring works end-to-end without requiring a live Firestore connection.

Rationale: The acceptance tests exercise through driving ports (domain services + initializeApp orchestration). The Firestore SDK is a thick client; real adapter integration testing belongs in adapter-level tests, not walking skeletons. The WS answers "can a user accomplish their goal?" through the port boundary.

## Walking Skeleton Scenarios (3)

### WS-1: Staple added on one device appears on the other via real-time listener

**Story trace**: US-01
**Driving port**: StapleStorage (via adapter factory with onChange callback)
**Layers touched**: Adapter factory -> onChange callback -> Hook orchestration -> StapleLibrary -> Observable outcome (staple list updated)
**User value**: "My staples sync across devices without restart"

### WS-2: Trip checkoff persists to cloud and loads on another device

**Story trace**: US-02, US-03
**Driving port**: TripStorage, TripService (via adapter factory with onChange callback)
**Layers touched**: TripService.checkOff -> TripStorage.saveTrip -> Cloud persist -> onSnapshot -> onChange -> TripService reload -> Observable outcome (checked state visible)
**User value**: "My trip progress syncs across devices"

### WS-3: New staple auto-adds to active trip without losing sweep progress

**Story trace**: US-05
**Driving port**: StapleLibrary + TripService (orchestrated by hook layer)
**Layers touched**: StapleLibrary.addStaple -> onChange fires -> Hook detects new staple -> TripService.addItem -> Observable outcome (trip item created, sweep preserved)
**User value**: "New staples appear in my trip without Reset Sweep"

## Implementation Sequence

Enable tests one at a time in this order:

1. **WS-1** -- Proves the onChange callback pattern works for real-time data propagation
2. **WS-2** -- Proves trip storage works end-to-end through cloud persistence
3. **WS-3** -- Proves cross-domain orchestration (staple -> trip auto-add)

Then proceed to focused scenarios in story order:
4. S-01 through S-04 (US-01 remaining)
5. S-05 through S-08 (US-02 remaining)
6. S-09, S-10 (US-03)
7. S-11 through S-14 (US-04)
8. S-15 through S-17 (US-05 remaining)
9. S-18 through S-21 (US-06)
10. S-22 through S-24 (US-07)
11. S-25, S-26 (US-08)
