# Acceptance Tests: correct-sync-behavior

## Prior Wave Confirmation Checklist

- [x] DISCUSS artifacts read: user-stories.md (8 stories), story-map.md, wave-decisions.md, outcome-kpis.md, shared-artifacts-registry.md, journey-sync.yaml
- [x] DESIGN artifacts read: architecture/brief.md, adr-001, adr-002, design/wave-decisions.md
- [x] Driving ports identified: StapleLibrary, TripService, initializeApp/useAppInitialization, AdapterFactories
- [x] Domain language extracted: staple, trip, trip item, area, section order, carryover, sweep, checkoff, skip, needed, stapleId, active trip, completed trip, onChange, unsubscribe
- [x] Failure modes listed from journey SSOT (11 modes across 5 steps)
- [x] KPI contracts: MISSING (soft gate -- warned, proceeding)
- [x] DEVOPS artifacts: MISSING (using defaults, proceeding)

## Scenario Summary

| Category | Count | Percentage |
|----------|-------|------------|
| Walking skeleton | 3 | 10% |
| Happy path | 13 | 45% |
| Error / edge case | 13 | 45% |
| **Total** | **29** | 100% |

Error path ratio: 45% (exceeds 40% minimum).

## Story-to-Scenario Traceability

| Story | Scenarios |
|-------|-----------|
| US-01 | WS-1, S-01, S-02, S-03, S-04 |
| US-02 | WS-2, S-05, S-06, S-07, S-08 |
| US-03 | S-09, S-10 |
| US-04 | S-11, S-12, S-13, S-14 |
| US-05 | WS-3, S-15, S-16, S-17 |
| US-06 | S-18, S-19, S-20, S-21 |
| US-07 | S-22, S-23, S-24 |
| US-08 | S-25, S-26 |

---

## Walking Skeleton Scenarios

### WS-1: Staple added on one device appears on the other via real-time listener [US-01] @walking_skeleton @driving_port

```gherkin
Scenario: Staple added on one device appears on the other without restart
  Given Clemens has a staple library with "Milk" and "Eggs"
  And a real-time listener is active on the staple library
  When "Olive Oil" (area: "Kitchen Cabinets", section: "Oils", aisle: 7) is added to the staple library from a remote device
  Then the staple library contains "Milk", "Eggs", and "Olive Oil"
  And the onChange callback fires to signal the update
```

### WS-2: Trip state syncs to cloud and loads on another device [US-02, US-03] @walking_skeleton @driving_port

```gherkin
Scenario: Trip checkoff persists to cloud and appears on another device
  Given Clemens has an active trip with "Milk", "Eggs", and "Bread"
  And the trip is stored in cloud storage
  And a real-time listener is active on the trip
  When Clemens checks off "Milk" on his phone
  Then the trip in cloud storage shows "Milk" as checked with a timestamp
  And when the trip updates arrive from a remote change
  Then "Milk" appears as checked on the other device
```

### WS-3: New staple auto-adds to active trip without losing sweep progress [US-05] @walking_skeleton @driving_port

```gherkin
Scenario: New staple appears in active trip without resetting sweep
  Given Clemens has an active trip started with "Milk" and "Eggs"
  And the "Bathroom" area sweep is completed
  When Clemens adds "Paper Towels" (area: "Bathroom") as a new staple
  And the orchestration layer detects the new staple
  Then "Paper Towels" appears in the active trip
  And the "Bathroom" area sweep progress is preserved
  And the trip contains 3 items total
```

---

## US-01: Real-Time Listeners on Staples, Areas, and Section Order

### S-01: Area rename propagates via real-time listener [US-01] @driving_port

```gherkin
Scenario: Area rename on one device reflected on the other
  Given Clemens has areas including "Pantry"
  And a real-time listener is active on the area list
  When "Pantry" is renamed to "Garage Pantry" from a remote device
  Then the area list contains "Garage Pantry" instead of "Pantry"
  And the onChange callback fires
```

### S-02: Section order change syncs via listener [US-01] @driving_port

```gherkin
Scenario: Section order change propagates to the other device
  Given Clemens has section order ["Dairy", "Produce", "Bakery"]
  And a real-time listener is active on section order
  When the section order changes to ["Produce", "Dairy", "Bakery"] from a remote device
  Then the local section order is ["Produce", "Dairy", "Bakery"]
  And the onChange callback fires
```

### S-03: Staple removal syncs via listener [US-01] @driving_port

```gherkin
Scenario: Staple removed on one device disappears on the other
  Given Clemens has staples "Milk", "Eggs", and "Soda"
  And a real-time listener is active on the staple library
  When "Soda" is removed from the staple library on a remote device
  Then the staple library contains only "Milk" and "Eggs"
  And the onChange callback fires
```

### S-04: Own write does not trigger onChange callback [US-01] @driving_port

```gherkin
Scenario: Local write echoed back by listener does not trigger redundant update
  Given Clemens has staples "Milk" and "Eggs"
  And a real-time listener is active on the staple library
  When Clemens adds "Bread" locally
  And the listener receives the echoed write with the same data
  Then the onChange callback does not fire for the echo
  And the staple library contains "Milk", "Eggs", and "Bread"
```

---

## US-02: Firestore Trip Storage Adapter

### S-05: Trip state persists to cloud on checkoff [US-02] @driving_port

```gherkin
Scenario: Trip checkoff is persisted to cloud storage
  Given Clemens has an active trip with "Milk", "Eggs", and "Bread" in cloud storage
  When Clemens checks off "Milk"
  Then the trip in cloud storage contains "Milk" as checked
  And the checkoff timestamp is recorded
```

### S-06: Carryover persists to cloud on trip completion [US-02] @driving_port

```gherkin
Scenario: Unbought items saved as carryover in cloud storage
  Given Clemens has an active trip with 3 items and "Olive Oil" is unchecked
  And "Milk" and "Eggs" are checked off
  When Clemens completes the trip
  Then "Olive Oil" is saved as carryover in cloud storage
  And the trip status is "completed" in cloud storage
```

### S-07: Trip loads from cloud on initialization [US-02] @driving_port

```gherkin
Scenario: Trip loads from cloud storage during app initialization
  Given cloud storage contains a trip with 8 items and 3 checked off
  When the app initializes and reads from cloud storage
  Then all 8 items are loaded into the trip
  And the 3 checked items retain their checked state and timestamps
```

### S-08: App continues when cloud write fails [US-02] @driving_port @infrastructure-failure @in-memory

```gherkin
Scenario: App does not block when cloud storage write fails
  Given Clemens has an active trip with "Eggs"
  And cloud storage writes are failing silently
  When Clemens checks off "Eggs"
  Then "Eggs" appears checked in the local view immediately
  And the app does not show an error or freeze
```

---

## US-03: Real-Time Listeners on Trip Data

### S-09: Skipped item syncs in real-time [US-03] @driving_port

```gherkin
Scenario: Skipped item on one device reflected on the other
  Given Clemens has an active trip with "Butter" marked as needed
  And a real-time listener is active on the trip
  When "Butter" is marked as skipped from a remote device
  Then the local trip shows "Butter" as not needed
  And the onChange callback fires
```

### S-10: Quick-added item appears on other device via trip sync [US-03] @driving_port

```gherkin
Scenario: Quick-added item appears on other device through trip sync
  Given Clemens has an active trip with "Milk" and "Eggs"
  And a real-time listener is active on the trip
  When "Birthday Candles" is quick-added to the trip from a remote device
  Then the local trip contains "Milk", "Eggs", and "Birthday Candles"
  And the onChange callback fires
```

---

## US-04: Listener Cleanup on Unmount and Logout

### S-11: All listeners unsubscribed on logout [US-04] @driving_port

```gherkin
Scenario: All listeners are cleaned up when Clemens logs out
  Given Clemens is logged in and real-time listeners are active on staples, areas, section order, and trip
  When Clemens logs out
  Then all 4 listeners are unsubscribed
  And no further onChange callbacks fire from remote changes
```

### S-12: Listeners unsubscribed on component unmount [US-04] @driving_port

```gherkin
Scenario: Listeners are cleaned up when the app component unmounts
  Given the app is initialized with active listeners
  When the app component unmounts
  Then all listeners are unsubscribed
```

### S-13: No duplicate listeners after re-mount [US-04] @driving_port

```gherkin
Scenario: Re-mounting the app does not create duplicate listeners
  Given Clemens navigated away and the app component unmounted
  And old listeners were cleaned up
  When the app component re-mounts
  Then new listeners are created
  And only one set of listeners is active (no duplicates)
```

### S-14: Stale listener callback does not corrupt state after logout [US-04] @driving_port @infrastructure-failure @in-memory

```gherkin
Scenario: Delayed listener callback after logout does not update state
  Given Clemens has logged out and listeners were cleaned up
  When a stale listener callback arrives after cleanup
  Then the callback is ignored
  And the app state is not modified
```

---

## US-05: New Staple Auto-Adds to Active Trip

### S-15: New staple on remote device appears in trip via sync [US-05] @driving_port

```gherkin
Scenario: New staple added on remote device appears in trip via sync
  Given Clemens has an active trip with "Milk" and "Eggs"
  And a real-time listener is active on the staple library
  When "Tahini" (area: "Kitchen Cabinets") is added as a staple from a remote device
  And the orchestration layer detects the new staple
  Then "Tahini" appears in the active trip
  And the trip item has a stapleId linking to the "Tahini" staple
```

### S-16: Removed staple disappears from active trip [US-05] @driving_port

```gherkin
Scenario: Removing a staple also removes it from the active trip
  Given Clemens has an active trip containing "Soda" (stapleId: "staple-soda-123")
  And "Soda" is in the staple library
  When Clemens removes "Soda" from the staple library
  And the orchestration layer detects the removed staple
  Then "Soda" is no longer in the active trip
```

### S-17: Staple added but trip persist fails leaves staple synced, trip local-only [US-05] @driving_port @infrastructure-failure @in-memory

```gherkin
Scenario: Trip persist failure after auto-add does not lose the staple
  Given Clemens has an active trip and cloud storage is failing for trip writes
  When Clemens adds "Paper Towels" as a new staple
  Then "Paper Towels" is saved to the staple library
  And "Paper Towels" is added to the local trip view
  And the app does not show an error
```

---

## US-06: Migrate Local Trip to Cloud

### S-18: Local trip migrates to cloud on first sync-enabled launch [US-06] @driving_port

```gherkin
Scenario: Existing local trip migrates to cloud storage on first sync launch
  Given Clemens has a local trip with 15 items and 7 checked off
  And cloud storage has no trip for his account
  When the app initializes with the sync-enabled version
  Then all 15 items with their checkoff states are written to cloud storage
  And the app uses cloud storage for trip data going forward
```

### S-19: Cloud trip takes precedence over local trip [US-06] @driving_port

```gherkin
Scenario: Cloud trip takes precedence over stale local trip
  Given cloud storage has a trip with 12 items
  And local storage has a stale trip with 10 items
  When the app initializes
  Then the trip loaded has 12 items (from cloud)
  And the local trip is ignored
```

### S-20: Fresh user with no trip data starts clean [US-06] @driving_port

```gherkin
Scenario: New user with no trip data anywhere starts a fresh trip
  Given cloud storage has no trip for Clemens
  And local storage has no trip
  When the app initializes
  Then a new trip is created from the staple library
```

### S-21: Carryover data migrates alongside trip [US-06] @driving_port

```gherkin
Scenario: Carryover items migrate from local storage to cloud
  Given Clemens has carryover items "Olive Oil" and "Sponges" in local storage
  And cloud storage has no carryover for his account
  When the app initializes with the sync-enabled version
  Then "Olive Oil" and "Sponges" are written as carryover to cloud storage
```

---

## US-07: Prevent Duplicate Trip Items

### S-22: No duplicate when trip sync delivers item already added locally [US-07] @driving_port

```gherkin
Scenario: No duplicate when remote trip update contains locally added item
  Given Clemens has an active trip with "Tahini" (stapleId: "staple-tahini-abc")
  When the trip listener receives an update also containing "Tahini" (same stapleId)
  Then the trip contains exactly one "Tahini" item
```

### S-23: Staple and one-off with same name coexist [US-07] @driving_port

```gherkin
Scenario: Staple item and one-off item with same name are not considered duplicates
  Given Clemens has a trip with "Milk" (stapleId: "staple-milk-1", type: staple)
  When Clemens quick-adds a one-off "Milk" (stapleId: null)
  Then the trip contains two "Milk" items
  And one is a staple and one is a one-off
```

### S-24: Re-added staple gets fresh trip item after removal [US-07] @driving_port @property

```gherkin
Scenario: Re-added staple with new ID gets a fresh trip item
  Given Clemens removed "Tahini" from staples (old trip item removed)
  When Clemens re-adds "Tahini" as a staple (with a new stapleId)
  Then a new trip item for "Tahini" is created with the new stapleId
  And the trip contains exactly one "Tahini"
```

---

## US-08: Listener Re-Establishment After Re-Login

### S-25: Real-time sync resumes after re-login [US-08] @driving_port

```gherkin
Scenario: Sync resumes after logging out and back in
  Given Clemens logged out and all listeners were cleaned up
  When Clemens logs back in
  Then new real-time listeners are established for staples, areas, section order, and trip
  And data reflects the latest state from cloud storage
```

### S-26: Different user sees own data after login switch [US-08] @driving_port

```gherkin
Scenario: Different user sees their own data after login
  Given Clemens logged out on his phone
  When his partner logs in on the same phone
  Then the partner sees their own staple library and trip
  And no data from Clemens is visible
```
